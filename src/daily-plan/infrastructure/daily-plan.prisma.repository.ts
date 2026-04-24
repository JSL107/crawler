import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DailyPlan } from '../../agent/pm/domain/pm-agent.type';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DailyPlanRepositoryPort,
  DailyPlanSnapshot,
  UpsertDailyPlanInput,
} from '../domain/port/daily-plan.repository.port';

@Injectable()
export class DailyPlanPrismaRepository implements DailyPlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert({
    planDate,
    plan,
    agentRunId,
    evidenceIds,
  }: UpsertDailyPlanInput): Promise<DailyPlanSnapshot> {
    const normalizedDate = toDateOnly(planDate);
    const record = await this.prisma.dailyPlan.upsert({
      where: { planDate: normalizedDate },
      create: {
        planDate: normalizedDate,
        planJson: plan as unknown as Prisma.InputJsonValue,
        agentRunId,
        evidenceIds,
      },
      update: {
        planJson: plan as unknown as Prisma.InputJsonValue,
        agentRunId,
        evidenceIds,
      },
    });

    return mapToSnapshot(record);
  }

  async findByDate(planDate: Date): Promise<DailyPlanSnapshot | null> {
    const record = await this.prisma.dailyPlan.findUnique({
      where: { planDate: toDateOnly(planDate) },
    });
    if (!record) {
      return null;
    }
    return mapToSnapshot(record);
  }
}

// Prisma @db.Date 컬럼은 UTC 00:00:00 로 저장되므로 호출자가 넘긴 Date 의 UTC 날짜만 남긴다.
// (planDate 가 unique 라 시간 정보가 다르면 같은 날로 인식 안 됨 — 반드시 정규화 필요)
const toDateOnly = (date: Date): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

// Prisma row → domain snapshot. planJson 은 unknown 으로 받아 그대로 DailyPlan 타입으로 노출.
// (parser 쪽에서 shape 검증은 이미 수행됨 — 여기선 trust).
const mapToSnapshot = (record: {
  id: number;
  planDate: Date;
  planJson: Prisma.JsonValue;
  agentRunId: number;
  evidenceIds: number[];
  createdAt: Date;
  updatedAt: Date;
}): DailyPlanSnapshot => ({
  id: record.id,
  planDate: record.planDate,
  plan: record.planJson as unknown as DailyPlan,
  agentRunId: record.agentRunId,
  evidenceIds: record.evidenceIds,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});
