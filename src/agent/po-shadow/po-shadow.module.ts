import { Module } from '@nestjs/common';

import { AgentRunModule } from '../../agent-run/agent-run.module';
import { ModelRouterModule } from '../../model-router/model-router.module';
import { GeneratePoShadowUsecase } from './application/generate-po-shadow.usecase';

@Module({
  imports: [ModelRouterModule, AgentRunModule],
  providers: [GeneratePoShadowUsecase],
  exports: [GeneratePoShadowUsecase],
})
export class PoShadowModule {}
