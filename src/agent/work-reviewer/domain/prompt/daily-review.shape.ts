import { DailyReview } from '../work-reviewer.type';

// DailyReview shape 검증 유틸 — parser 와 PM previous-worklog-formatter 두 군데에서 동일 검증 필요.
// 통합하여 규칙 분기 방지.
export const isDailyReviewShape = (value: unknown): value is DailyReview => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.summary === 'string' &&
    isImpactShape(record.impact) &&
    isImprovementShape(record.improvementBeforeAfter) &&
    isStringArray(record.nextActions) &&
    typeof record.oneLineAchievement === 'string'
  );
};

const isImpactShape = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isStringArray(record.quantitative) && typeof record.qualitative === 'string'
  );
};

const isImprovementShape = (value: unknown): boolean => {
  if (value === null) {
    return true;
  }
  if (typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.before === 'string' && typeof record.after === 'string';
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
