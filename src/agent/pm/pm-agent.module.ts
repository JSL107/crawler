import { Module } from '@nestjs/common';

import { AgentRunModule } from '../../agent-run/agent-run.module';
import { DailyPlanModule } from '../../daily-plan/daily-plan.module';
import { GithubModule } from '../../github/github.module';
import { ModelRouterModule } from '../../model-router/model-router.module';
import { NotionModule } from '../../notion/notion.module';
import { SlackCollectorModule } from '../../slack-collector/slack-collector.module';
import { DailyPlanContextCollector } from './application/daily-plan-context.collector';
import { DailyPlanEvidenceBuilder } from './application/daily-plan-evidence.builder';
import { DailyPlanPromptBuilder } from './application/daily-plan-prompt.builder';
import { GenerateDailyPlanUsecase } from './application/generate-daily-plan.usecase';
import { SyncContextUsecase } from './application/sync-context.usecase';

@Module({
  imports: [
    ModelRouterModule,
    AgentRunModule,
    DailyPlanModule,
    GithubModule,
    NotionModule,
    SlackCollectorModule,
  ],
  providers: [
    GenerateDailyPlanUsecase,
    SyncContextUsecase,
    DailyPlanContextCollector,
    DailyPlanPromptBuilder,
    DailyPlanEvidenceBuilder,
  ],
  exports: [GenerateDailyPlanUsecase, SyncContextUsecase],
})
export class PmAgentModule {}
