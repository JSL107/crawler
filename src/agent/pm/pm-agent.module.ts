import { Module } from '@nestjs/common';

import { AgentRunModule } from '../../agent-run/agent-run.module';
import { GithubModule } from '../../github/github.module';
import { ModelRouterModule } from '../../model-router/model-router.module';
import { GenerateDailyPlanUsecase } from './application/generate-daily-plan.usecase';

@Module({
  imports: [ModelRouterModule, AgentRunModule, GithubModule],
  providers: [GenerateDailyPlanUsecase],
  exports: [GenerateDailyPlanUsecase],
})
export class PmAgentModule {}
