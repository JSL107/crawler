import { Inject, Injectable } from '@nestjs/common';

import { NotionTask } from '../domain/notion.type';
import {
  ListActiveTasksOptions,
  NOTION_CLIENT_PORT,
  NotionClientPort,
} from '../domain/port/notion-client.port';

// 설정된 Notion task DB(들)에서 page row 들을 조회 — PM Agent 가 evidence 로 활용.
@Injectable()
export class ListActiveTasksUsecase {
  constructor(
    @Inject(NOTION_CLIENT_PORT)
    private readonly notionClient: NotionClientPort,
  ) {}

  async execute(options?: ListActiveTasksOptions): Promise<NotionTask[]> {
    return this.notionClient.listActiveTasks(options);
  }
}
