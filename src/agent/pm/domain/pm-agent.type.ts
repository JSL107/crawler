// 서브 태스크 (WBS) — 에이전트가 큰 태스크를 더 작은 단위로 분할한 결과.
// 2시간 이상 걸릴 것 같은 태스크만 쪼갠다 (pm-system.prompt 에 규칙).
export interface SubTask {
  title: string;
  estimatedMinutes: number;
}

// 태스크 source 식별자.
export type TaskSource =
  | 'GITHUB' // GitHub Issue/PR assigned
  | 'NOTION' // Notion task DB row
  | 'SLACK' // Slack 멘션 blocker 후보
  | 'USER_INPUT' // /today 자유 텍스트
  | 'ROLLOVER'; // 어제 미완료 이월

// 단일 태스크 — WBS(subtasks) + 병목(isCriticalPath) 포함.
// id 는 source 별 자연 키 (GITHUB: "owner/repo#12", NOTION: pageId, 그 외: 해시/ts 기반).
export interface TaskItem {
  id: string;
  title: string;
  source: TaskSource;
  subtasks: SubTask[];
  isCriticalPath: boolean;
}

// 이월(Variance) 분석 — 어제 plan 과 실제 결과를 비교해 모델이 판단한 내용.
// analysisReasoning 은 사용자에게 "왜 이 이월 태스크를 오늘 어느 위치에 배치/드랍했는지" 설명용.
export interface VarianceAnalysis {
  rolledOverTasks: string[];
  analysisReasoning: string;
}

export interface DailyPlan {
  topPriority: TaskItem;
  varianceAnalysis: VarianceAnalysis;
  morning: TaskItem[];
  afternoon: TaskItem[];
  blocker: string | null;
  estimatedHours: number;
  reasoning: string;
}

export interface GenerateDailyPlanInput {
  tasksText: string;
  slackUserId: string;
}

// PM Agent `/today` 한 번 실행에 대해 AgentRun.inputSnapshot 으로 저장되는 메트릭/메타 집합.
// reporting / 디버깅 (prompt 과 크거나 context source 가 빠졌는지 추적) 용도.
export interface DailyPlanInputSnapshot {
  tasksText: string;
  slackUserId: string;
  githubItemCount: number;
  githubFetchAttempted: boolean;
  githubFetchSucceeded: boolean;
  previousPlanReferenced: boolean;
  previousPlanAgentRunId: number | null;
  previousWorklogReferenced: boolean;
  previousWorklogAgentRunId: number | null;
  slackMentionCount: number;
  slackMentionSinceHours: number;
  notionTaskCount: number;
  promptByteLength: number;
  truncated: {
    github: number;
    notion: number;
    slackMentions: number;
    droppedSections: string[];
  };
}
