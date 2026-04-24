import { NotionTask } from '../notion.type';

export const NOTION_CLIENT_PORT = Symbol('NOTION_CLIENT_PORT');

// @notionhq/client Client 인스턴스를 주입하기 위한 DI 토큰. 어댑터 외부 직접 참조 금지.
// `NotionApiClient` 의 생성자에서만 주입받아 테스트 시 mock 으로 교체 가능하게 한다.
export const NOTION_CLIENT_INSTANCE = Symbol('NOTION_CLIENT_INSTANCE');

export interface ListActiveTasksOptions {
  // 미지정 시 NOTION_TASK_DB_IDS env 를 그대로 사용.
  databaseIds?: string[];
  // DB 한 건당 최대 결과 수 (무한 페이지네이션 방지).
  perDatabaseLimit?: number;
}

export interface NotionClientPort {
  listActiveTasks(options?: ListActiveTasksOptions): Promise<NotionTask[]>;
}
