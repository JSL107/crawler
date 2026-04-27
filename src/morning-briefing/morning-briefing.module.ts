import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PmAgentModule } from '../agent/pm/pm-agent.module';
import { SlackModule } from '../slack/slack.module';
import { MorningBriefingScheduler } from './application/morning-briefing.scheduler';
import { MORNING_BRIEFING_QUEUE } from './domain/morning-briefing.type';
import { MorningBriefingConsumer } from './infrastructure/morning-briefing.consumer';

// PRO-1 Morning Briefing 도메인 모듈.
// PmAgentModule (GenerateDailyPlanUsecase) + SlackModule (postMessage) 를 모두 import 하기 위해
// 두 모듈 어느 쪽에도 둘 수 없는 contents 를 별도 도메인으로 분리. AppModule 만 이 모듈을 알면 된다.
@Module({
  imports: [
    BullModule.registerQueue({ name: MORNING_BRIEFING_QUEUE }),
    PmAgentModule,
    SlackModule,
  ],
  providers: [MorningBriefingScheduler, MorningBriefingConsumer],
})
export class MorningBriefingModule {}
