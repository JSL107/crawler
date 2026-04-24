import { isDailyReviewShape } from '../../../work-reviewer/domain/prompt/daily-review.shape';
import { DailyReview } from '../../../work-reviewer/domain/work-reviewer.type';

// 직전 Work Reviewer (`/worklog`) 결과를 PM 모델에게 "어제 한 일" 컨텍스트로 보여주는 섹션.
// PM 이 오늘 plan 만들 때 "어제 끝낸 것 / 미완료 추정" 을 더 정확히 판단하게 한다 (기획서 §7.1 입력).
export const formatPreviousDailyReviewSection = ({
  review,
  endedAt,
}: {
  review: DailyReview;
  endedAt: Date;
}): string => {
  const lines: string[] = [
    `[직전 Work Reviewer 실행 (${endedAt.toISOString()}) — 어제 한 일 회고]`,
    `- 요약: ${review.summary}`,
  ];

  if (review.impact.quantitative.length > 0) {
    lines.push('- 정량 근거:');
    for (const item of review.impact.quantitative) {
      lines.push(`  - ${item}`);
    }
  }

  lines.push(`- 질적 영향: ${review.impact.qualitative}`);

  if (review.improvementBeforeAfter) {
    lines.push(
      `- 개선 전: ${review.improvementBeforeAfter.before}`,
      `- 개선 후: ${review.improvementBeforeAfter.after}`,
    );
  }

  if (review.nextActions.length > 0) {
    lines.push('- 다음 액션 (전일 시점에 식별된):');
    for (const action of review.nextActions) {
      lines.push(`  - ${action}`);
    }
  }

  lines.push(
    `- 한 줄 성과: ${review.oneLineAchievement}`,
    '',
    '※ 위 "다음 액션" 항목 중 사용자 입력 / GitHub assigned 에 그대로 남아있는 것은 "오늘 이어가야 할 것" 으로 우선 고려한다.',
  );

  return lines.join('\n');
};

// previous output (DB 의 Json) 을 안전하게 DailyReview 로 narrow.
// shape 가 안 맞으면 null — 호출자는 "이전 worklog 없음" 으로 graceful 처리.
// shape 판정은 work-reviewer domain 의 isDailyReviewShape 로 통합 (parser 와 동일 규칙).
export const coerceToDailyReview = (value: unknown): DailyReview | null =>
  isDailyReviewShape(value) ? value : null;
