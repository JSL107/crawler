import { Inject, Injectable } from '@nestjs/common';

import {
  ListMyMentionsOptions,
  SLACK_COLLECTOR_PORT,
  SlackCollectorPort,
} from '../domain/port/slack-collector.port';
import { SlackMention } from '../domain/slack-collector.type';

// 사용자에게 멘션된 최근 Slack 메시지 모음 — PM Agent 가 "blocker 후보" 로 prompt 에 노출.
@Injectable()
export class ListMyMentionsUsecase {
  constructor(
    @Inject(SLACK_COLLECTOR_PORT)
    private readonly collector: SlackCollectorPort,
  ) {}

  async execute(options: ListMyMentionsOptions): Promise<SlackMention[]> {
    return this.collector.listMyMentions(options);
  }
}
