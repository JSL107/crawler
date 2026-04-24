import { Inject, Injectable } from '@nestjs/common';

import { DailyPlan } from '../../agent/pm/domain/pm-agent.type';
import {
  DAILY_PLAN_REPOSITORY_PORT,
  DailyPlanRepositoryPort,
  DailyPlanSnapshot,
} from '../domain/port/daily-plan.repository.port';

@Injectable()
export class DailyPlanService {
  constructor(
    @Inject(DAILY_PLAN_REPOSITORY_PORT)
    private readonly repository: DailyPlanRepositoryPort,
  ) {}

  // PM Agent /today 성공 후 호출 — plan_date 유니크 기준 upsert.
  // evidenceIds 는 해당 실행의 EvidenceRecord id 배열 (agent_run_id 로부터 조회해도 무방하나, 저장 편의).
  async recordDailyPlan({
    planDate,
    plan,
    agentRunId,
    evidenceIds,
  }: {
    planDate: Date;
    plan: DailyPlan;
    agentRunId: number;
    evidenceIds: number[];
  }): Promise<DailyPlanSnapshot> {
    return this.repository.upsert({ planDate, plan, agentRunId, evidenceIds });
  }

  async findByDate(planDate: Date): Promise<DailyPlanSnapshot | null> {
    return this.repository.findByDate(planDate);
  }
}
