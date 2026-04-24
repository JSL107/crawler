import { DailyPlan } from '../../../agent/pm/domain/pm-agent.type';

export const DAILY_PLAN_REPOSITORY_PORT = Symbol('DAILY_PLAN_REPOSITORY_PORT');

export interface UpsertDailyPlanInput {
  planDate: Date; // day-precision (시간 정보 무시)
  plan: DailyPlan;
  agentRunId: number;
  evidenceIds: number[];
}

export interface DailyPlanSnapshot {
  id: number;
  planDate: Date;
  plan: DailyPlan;
  agentRunId: number;
  evidenceIds: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyPlanRepositoryPort {
  // planDate 기준 upsert — 같은 날 재실행 시 최신 plan 으로 덮어쓰기.
  upsert(input: UpsertDailyPlanInput): Promise<DailyPlanSnapshot>;
  findByDate(planDate: Date): Promise<DailyPlanSnapshot | null>;
}
