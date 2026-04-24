import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DailyReview } from '../../agent/work-reviewer/domain/work-reviewer.type';
import {
  NOTION_CLIENT_PORT,
  NotionClientPort,
  NotionDailyPlanPage,
  NotionPlanBlock,
} from '../domain/port/notion-client.port';
import { formatDayPageTitle } from './append-daily-plan.usecase';

export interface AppendWorklogInput {
  review: DailyReview;
  reviewDate: Date; // day-precision (UTC 00:00, WR usecase 가 KST 로 정규화해 전달)
}

const KST_OFFSET_HOURS = 9;

// Work Reviewer `/worklog` 성공 후 Notion day-page 에 "Check Out HH:MM + KEEP-PROBLEM-TRY" 섹션 append.
// 같은 날 day-page 가 이미 있으면 재사용 (대개 /today 가 먼저 Check in 추가). 없으면 새로 생성.
// DB 미설정 시 null — 호출자는 graceful skip.
@Injectable()
export class AppendWorklogUsecase {
  private readonly logger = new Logger(AppendWorklogUsecase.name);

  constructor(
    @Inject(NOTION_CLIENT_PORT) private readonly client: NotionClientPort,
    private readonly configService: ConfigService,
  ) {}

  async execute({
    review,
    reviewDate,
  }: AppendWorklogInput): Promise<NotionDailyPlanPage | null> {
    const databaseId = this.resolveDailyPlanDatabaseId();
    if (!databaseId) {
      this.logger.warn(
        'NOTION_DAILY_PLAN_DATABASE_ID 미설정 — Notion 기록 skip (task DB 재사용 금지)',
      );
      return null;
    }

    const title = formatDayPageTitle(reviewDate);
    const page = await this.client.findOrCreateDailyPage({
      databaseId,
      title,
    });
    await this.client.appendBlocks({
      pageId: page.pageId,
      blocks: buildCheckOutBlocks(review),
    });
    return page;
  }

  // /today 와 동일 DB 사용 — Check in / Check Out 같은 day-page 에 붙이기 위함.
  private resolveDailyPlanDatabaseId(): string | null {
    const explicit = this.configService
      .get<string>('NOTION_DAILY_PLAN_DATABASE_ID')
      ?.trim();
    return explicit && explicit.length > 0 ? explicit : null;
  }
}

const getKstHourMinute = (): string => {
  const nowMs = Date.now();
  const kstDate = new Date(nowMs + KST_OFFSET_HOURS * 60 * 60 * 1000);
  const hour = String(kstDate.getUTCHours()).padStart(2, '0');
  const minute = String(kstDate.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
};

// DailyReview → Check Out 섹션 blocks.
// 사용자 "일일 회고" 템플릿 포맷: Check Out HH:MM (heading2) / 오늘 하루에 대한 회고 (subheading)
// → 요약 + KEEP-PROBLEM-TRY (subheading) → KEEP/PROBLEM/TRY 각각 subheading + bullet.
// KPT mapping:
//   KEEP    = oneLineAchievement + impact.qualitative + impact.quantitative[]
//   PROBLEM = improvementBeforeAfter.before (null 이면 "(없음)")
//   TRY     = nextActions[]
const buildCheckOutBlocks = (review: DailyReview): NotionPlanBlock[] => {
  const blocks: NotionPlanBlock[] = [
    { type: 'heading', text: `Check Out ${getKstHourMinute()}` },
    { type: 'subheading', text: '오늘 하루에 대한 회고' },
    { type: 'paragraph', text: review.summary },
    { type: 'subheading', text: 'KEEP - PROBLEM - TRY' },
  ];

  // KEEP
  blocks.push({ type: 'subheading', text: 'KEEP' });
  blocks.push({ type: 'bullet', text: review.oneLineAchievement });
  if (review.impact.qualitative.length > 0) {
    blocks.push({ type: 'bullet', text: review.impact.qualitative });
  }
  for (const item of review.impact.quantitative) {
    blocks.push({ type: 'bullet', text: item });
  }

  // PROBLEM
  blocks.push({ type: 'subheading', text: 'PROBLEM' });
  if (review.improvementBeforeAfter) {
    blocks.push({
      type: 'bullet',
      text: `개선 전: ${review.improvementBeforeAfter.before}`,
    });
    blocks.push({
      type: 'bullet',
      text: `개선 후: ${review.improvementBeforeAfter.after}`,
    });
  } else {
    blocks.push({ type: 'bullet', text: '(식별된 개선 포인트 없음)' });
  }

  // TRY
  blocks.push({ type: 'subheading', text: 'TRY' });
  if (review.nextActions.length === 0) {
    blocks.push({ type: 'bullet', text: '(다음 액션 없음)' });
  } else {
    for (const action of review.nextActions) {
      blocks.push({ type: 'bullet', text: action });
    }
  }

  blocks.push({ type: 'divider' });
  return blocks;
};
