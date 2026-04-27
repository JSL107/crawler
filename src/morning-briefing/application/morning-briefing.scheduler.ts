import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import {
  DEFAULT_MORNING_BRIEFING_CRON,
  DEFAULT_MORNING_BRIEFING_TIMEZONE,
  MORNING_BRIEFING_QUEUE,
  MorningBriefingJobData,
} from '../domain/morning-briefing.type';

const BRIEFING_JOB_NAME = 'briefing';

// PRO-1 Morning Briefing Producer.
// App 부팅 시 env 를 읽어 BullMQ repeatable job 을 (재)등록한다 — 멱등성 보장 위해 기존 repeatable 들을 정리 후 재등록.
// owner / targets / cron / timezone 모두 env 로 외부화. owner 미설정이면 모듈 자동 비활성화 (graceful).
@Injectable()
export class MorningBriefingScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MorningBriefingScheduler.name);

  constructor(
    @InjectQueue(MORNING_BRIEFING_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const owner = this.readOwnerOrNull();
    if (!owner) {
      this.logger.log(
        'Morning Briefing 비활성 (MORNING_BRIEFING_OWNER_SLACK_USER_ID 미설정).',
      );
      await this.cleanupExistingRepeatables();
      return;
    }

    const targets = this.parseDeliveryTargets({ ownerFallback: owner });
    const cron = this.readNonEmpty(
      'MORNING_BRIEFING_CRON',
      DEFAULT_MORNING_BRIEFING_CRON,
    );
    const tz = this.readNonEmpty(
      'MORNING_BRIEFING_TIMEZONE',
      DEFAULT_MORNING_BRIEFING_TIMEZONE,
    );

    // 기존 repeatable 들을 모두 정리한 뒤 재등록 — 부팅마다 owner/targets/cron 변경이 그대로 반영되도록.
    await this.cleanupExistingRepeatables();

    for (const target of targets) {
      const payload: MorningBriefingJobData = {
        ownerSlackUserId: owner,
        target,
      };
      await this.queue.add(BRIEFING_JOB_NAME, payload, {
        repeat: { pattern: cron, tz },
        // jobId 는 BullMQ 에서 dedup 키 — owner/target 별로 1개 repeatable 만 살아 있도록.
        // 멀티 인스턴스 동시 부팅에도 BullMQ 가 동일 jobId 를 dedup 처리하므로 1개만 유지된다.
        jobId: `morning-briefing:${owner}->${target}`,
        removeOnComplete: 100,
        removeOnFail: 100,
        // 재시도 정책 — Slack 일시 장애 / 모델 timeout / 네트워크 흔들림 등 transient 실패 회복.
        // 30s → 1m → 2m 지수 백오프, 최대 3회 시도. quota 폭주 방지를 위해 attempts 제한.
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      });
    }

    this.logger.log(
      `Morning Briefing 활성화 — owner=${owner}, targets=${targets.length}건, cron="${cron}" (${tz})`,
    );
  }

  private readOwnerOrNull(): string | null {
    const raw = this.configService.get<string>(
      'MORNING_BRIEFING_OWNER_SLACK_USER_ID',
    );
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  // DELIVERY_TARGETS 미설정이면 owner DM 으로 fallback.
  // 콤마 구분, 공백 trim, 빈 문자열 제거.
  private parseDeliveryTargets({
    ownerFallback,
  }: {
    ownerFallback: string;
  }): string[] {
    const raw = this.configService.get<string>(
      'MORNING_BRIEFING_DELIVERY_TARGETS',
    );
    if (!raw || raw.trim().length === 0) {
      return [ownerFallback];
    }
    const parsed = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return parsed.length > 0 ? parsed : [ownerFallback];
  }

  private readNonEmpty(key: string, fallback: string): string {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private async cleanupExistingRepeatables(): Promise<void> {
    const repeatables = await this.queue.getRepeatableJobs();
    for (const job of repeatables) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }
}
