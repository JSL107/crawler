import {
  DailyPlan,
  SubTask,
  TaskItem,
  TaskSource,
  VarianceAnalysis,
} from '../pm-agent.type';

const TASK_SOURCES: ReadonlySet<TaskSource> = new Set([
  'GITHUB',
  'NOTION',
  'SLACK',
  'USER_INPUT',
  'ROLLOVER',
]);

// DailyPlan shape 검증 — parser / previous-plan-formatter / migration 어댑터가 공유.
// 신버전 (TaskItem 기반) 만 허용. 구버전 (string[]) 은 coerceToDailyPlan 이 migration 후 이 검증을 통과하게 함.
export const isDailyPlanShape = (value: unknown): value is DailyPlan => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isTaskItemShape(record.topPriority) &&
    isVarianceAnalysisShape(record.varianceAnalysis) &&
    isTaskItemArray(record.morning) &&
    isTaskItemArray(record.afternoon) &&
    (record.blocker === null || typeof record.blocker === 'string') &&
    typeof record.estimatedHours === 'number' &&
    typeof record.reasoning === 'string'
  );
};

export const isTaskItemShape = (value: unknown): value is TaskItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.source === 'string' &&
    TASK_SOURCES.has(record.source as TaskSource) &&
    isSubTaskArray(record.subtasks) &&
    typeof record.isCriticalPath === 'boolean'
  );
};

const isSubTaskArray = (value: unknown): value is SubTask[] =>
  Array.isArray(value) && value.every(isSubTaskShape);

const isSubTaskShape = (value: unknown): value is SubTask => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.title === 'string' &&
    typeof record.estimatedMinutes === 'number'
  );
};

const isTaskItemArray = (value: unknown): value is TaskItem[] =>
  Array.isArray(value) && value.every(isTaskItemShape);

const isVarianceAnalysisShape = (value: unknown): value is VarianceAnalysis => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isStringArray(record.rolledOverTasks) &&
    typeof record.analysisReasoning === 'string'
  );
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
