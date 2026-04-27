import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { MorningBriefingScheduler } from './morning-briefing.scheduler';

describe('MorningBriefingScheduler', () => {
  let queue: jest.Mocked<
    Pick<Queue, 'add' | 'getRepeatableJobs' | 'removeRepeatableByKey'>
  >;
  let configMap: Record<string, string | undefined>;
  let scheduler: MorningBriefingScheduler;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(true),
    };
    configMap = {};
    const configService = {
      get: jest.fn((key: string) => configMap[key]),
    } as unknown as ConfigService;
    scheduler = new MorningBriefingScheduler(
      queue as unknown as Queue,
      configService,
    );
  });

  it('OWNER 미설정이면 모듈 비활성화 — queue.add 호출 안 함', async () => {
    await scheduler.onApplicationBootstrap();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('OWNER 만 있으면 owner DM 으로 fallback 발송 — repeatable 1개 등록', async () => {
    configMap = {
      MORNING_BRIEFING_OWNER_SLACK_USER_ID: 'U123',
    };
    await scheduler.onApplicationBootstrap();
    expect(queue.add).toHaveBeenCalledTimes(1);
    const [name, data, options] = queue.add.mock.calls[0];
    expect(name).toBe('briefing');
    expect(data).toEqual({ ownerSlackUserId: 'U123', target: 'U123' });
    expect(options).toMatchObject({
      repeat: { pattern: '30 8 * * *', tz: 'Asia/Seoul' },
      jobId: 'morning-briefing:U123->U123',
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
    });
  });

  it('DELIVERY_TARGETS 가 있으면 콤마 구분으로 다수 repeatable 등록', async () => {
    configMap = {
      MORNING_BRIEFING_OWNER_SLACK_USER_ID: 'U123',
      MORNING_BRIEFING_DELIVERY_TARGETS: 'C0AUNA9L8P8, U999, U777',
    };
    await scheduler.onApplicationBootstrap();
    expect(queue.add).toHaveBeenCalledTimes(3);
    const targets = queue.add.mock.calls.map((call) => call[1].target);
    expect(targets).toEqual(['C0AUNA9L8P8', 'U999', 'U777']);
  });

  it('CRON / TIMEZONE env 가 있으면 그 값으로 repeatable 등록', async () => {
    configMap = {
      MORNING_BRIEFING_OWNER_SLACK_USER_ID: 'U1',
      MORNING_BRIEFING_CRON: '0 9 * * 1-5',
      MORNING_BRIEFING_TIMEZONE: 'America/Los_Angeles',
    };
    await scheduler.onApplicationBootstrap();
    const [, , options] = queue.add.mock.calls[0];
    expect(options).toMatchObject({
      repeat: { pattern: '0 9 * * 1-5', tz: 'America/Los_Angeles' },
    });
  });

  it('기존 repeatable 들을 정리한 뒤 재등록 (멱등성)', async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      { key: 'old-key-1' } as never,
      { key: 'old-key-2' } as never,
    ]);
    configMap = { MORNING_BRIEFING_OWNER_SLACK_USER_ID: 'U1' };

    await scheduler.onApplicationBootstrap();

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('old-key-1');
    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('old-key-2');
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('OWNER 미설정 상태에서도 기존 repeatable 들은 정리 (env 비활성 전환 반영)', async () => {
    queue.getRepeatableJobs.mockResolvedValue([{ key: 'stale' } as never]);
    await scheduler.onApplicationBootstrap();
    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('stale');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('OWNER 가 공백만 있으면 비활성화로 간주', async () => {
    configMap = { MORNING_BRIEFING_OWNER_SLACK_USER_ID: '   ' };
    await scheduler.onApplicationBootstrap();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('DELIVERY_TARGETS 가 빈 문자열만 있으면 owner DM fallback', async () => {
    configMap = {
      MORNING_BRIEFING_OWNER_SLACK_USER_ID: 'U1',
      MORNING_BRIEFING_DELIVERY_TARGETS: '   ,, , ',
    };
    await scheduler.onApplicationBootstrap();
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add.mock.calls[0][1]).toEqual({
      ownerSlackUserId: 'U1',
      target: 'U1',
    });
  });
});
