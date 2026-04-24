import { Module } from '@nestjs/common';

import { DailyPlanService } from './application/daily-plan.service';
import { DAILY_PLAN_REPOSITORY_PORT } from './domain/port/daily-plan.repository.port';
import { DailyPlanPrismaRepository } from './infrastructure/daily-plan.prisma.repository';

@Module({
  providers: [
    DailyPlanService,
    {
      provide: DAILY_PLAN_REPOSITORY_PORT,
      useClass: DailyPlanPrismaRepository,
    },
  ],
  exports: [DailyPlanService],
})
export class DailyPlanModule {}
