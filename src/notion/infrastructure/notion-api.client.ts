import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

import { NotionException } from '../domain/notion.exception';
import { NotionTask } from '../domain/notion.type';
import { NotionErrorCode } from '../domain/notion-error-code.enum';
import {
  ListActiveTasksOptions,
  NOTION_CLIENT_INSTANCE,
  NotionClientPort,
} from '../domain/port/notion-client.port';

const DEFAULT_PER_DB_LIMIT = 50;

@Injectable()
export class NotionApiClient implements NotionClientPort {
  private readonly logger = new Logger(NotionApiClient.name);

  constructor(
    @Inject(NOTION_CLIENT_INSTANCE) private readonly client: Client | null,
    private readonly configService: ConfigService,
  ) {}

  async listActiveTasks({
    databaseIds,
    perDatabaseLimit = DEFAULT_PER_DB_LIMIT,
  }: ListActiveTasksOptions = {}): Promise<NotionTask[]> {
    if (!this.client) {
      throw new NotionException({
        code: NotionErrorCode.TOKEN_NOT_CONFIGURED,
        message:
          'NOTION_TOKEN 이 .env 에 설정되지 않아 Notion API 호출이 불가합니다.',
        status: HttpStatus.PRECONDITION_FAILED,
      });
    }

    const targetDbs = databaseIds ?? this.resolveDatabaseIdsFromEnv();
    if (targetDbs.length === 0) {
      // 토큰은 있지만 DB ID 가 없으면 빈 결과 — graceful (PM 이 그냥 없는 입력으로 처리).
      return [];
    }

    const tasks: NotionTask[] = [];
    for (const databaseId of targetDbs) {
      let response: Awaited<ReturnType<Client['databases']['query']>>;
      try {
        response = await this.client.databases.query({
          database_id: databaseId,
          page_size: perDatabaseLimit,
        });
      } catch (error: unknown) {
        // 한 DB 가 권한 미부여 / not_found 면 그 DB 만 skip + 로그 — 다른 DB 는 계속.
        this.logger.warn(
          `Notion DB ${databaseId} 조회 실패 (skip): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      for (const page of response.results) {
        if (!isFullPage(page)) {
          continue;
        }
        tasks.push(this.toNotionTask(page, databaseId));
      }
    }

    return tasks;
  }

  private resolveDatabaseIdsFromEnv(): string[] {
    const raw = this.configService.get<string>('NOTION_TASK_DB_IDS');
    if (!raw) {
      return [];
    }
    return raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private toNotionTask(page: FullPage, databaseId: string): NotionTask {
    const propertiesEntries: Array<[string, string]> = [];
    let title = '(제목 없음)';
    for (const [name, raw] of Object.entries(page.properties)) {
      if (raw.type === 'title') {
        const text = collectPlainText(raw.title);
        if (text.length > 0) {
          title = text;
        }
        continue;
      }
      const stringified = propertyToString(raw);
      if (stringified !== null && stringified.length > 0) {
        propertiesEntries.push([name, stringified]);
      }
    }
    return {
      databaseId,
      pageId: page.id,
      url: page.url,
      title,
      properties: Object.fromEntries(propertiesEntries),
    };
  }
}

// 최소한의 page 구조 (full page 만 사용 — partial response 는 isFullPage 로 필터).
type FullPage = {
  id: string;
  url: string;
  properties: Record<string, NotionProperty>;
};

const isFullPage = (page: unknown): page is FullPage => {
  if (typeof page !== 'object' || page === null) {
    return false;
  }
  const record = page as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.url === 'string' &&
    typeof record.properties === 'object' &&
    record.properties !== null
  );
};

// Notion property 종류는 많지만 PM evidence 용도엔 사람이 읽는 string 표현이면 충분.
// 알려지지 않은 type 은 null 로 두고 호출자가 skip.
type NotionProperty = { type: string } & Record<string, unknown>;

const collectPlainText = (segments: unknown): string => {
  if (!Array.isArray(segments)) {
    return '';
  }
  return segments
    .map((seg) => {
      if (typeof seg !== 'object' || seg === null) {
        return '';
      }
      const record = seg as Record<string, unknown>;
      return typeof record.plain_text === 'string' ? record.plain_text : '';
    })
    .join('')
    .trim();
};

const propertyToString = (prop: NotionProperty): string | null => {
  switch (prop.type) {
    case 'rich_text':
      return collectPlainText(prop.rich_text);
    case 'select':
      return readNamedOption(prop.select);
    case 'status':
      return readNamedOption(prop.status);
    case 'multi_select':
      return readNamedOptionsList(prop.multi_select);
    case 'people':
      return readPeople(prop.people);
    case 'date':
      return readDateRange(prop.date);
    case 'checkbox':
      return prop.checkbox === true ? '✓' : '✗';
    case 'number':
      return prop.number === null || prop.number === undefined
        ? ''
        : String(prop.number);
    case 'url':
    case 'email':
    case 'phone_number':
      return typeof prop[prop.type] === 'string'
        ? (prop[prop.type] as string)
        : '';
    case 'unique_id':
      return readUniqueId(prop.unique_id);
    case 'formula':
      return readFormula(prop.formula);
    case 'created_time':
    case 'last_edited_time':
      return typeof prop[prop.type] === 'string'
        ? (prop[prop.type] as string)
        : '';
    case 'created_by':
    case 'last_edited_by':
      return readSinglePerson(prop[prop.type]);
    default:
      return null; // 알려지지 않은 type 은 무시 (relation/rollup/files 등 — 필요시 case 추가)
  }
};

const readNamedOption = (option: unknown): string => {
  if (typeof option !== 'object' || option === null) {
    return '';
  }
  const record = option as Record<string, unknown>;
  return typeof record.name === 'string' ? record.name : '';
};

const readNamedOptionsList = (options: unknown): string => {
  if (!Array.isArray(options)) {
    return '';
  }
  return options
    .map((opt) => readNamedOption(opt))
    .filter(Boolean)
    .join(', ');
};

const readPeople = (people: unknown): string => {
  if (!Array.isArray(people)) {
    return '';
  }
  return people.map(readSinglePerson).filter(Boolean).join(', ');
};

const readSinglePerson = (person: unknown): string => {
  if (typeof person !== 'object' || person === null) {
    return '';
  }
  const record = person as Record<string, unknown>;
  if (typeof record.name === 'string') {
    return record.name;
  }
  return typeof record.id === 'string' ? record.id : '';
};

const readDateRange = (date: unknown): string => {
  if (typeof date !== 'object' || date === null) {
    return '';
  }
  const record = date as Record<string, unknown>;
  const start = typeof record.start === 'string' ? record.start : '';
  const end = typeof record.end === 'string' ? record.end : '';
  if (start && end) {
    return `${start} → ${end}`;
  }
  return start;
};

const readUniqueId = (uniqueId: unknown): string => {
  if (typeof uniqueId !== 'object' || uniqueId === null) {
    return '';
  }
  const record = uniqueId as Record<string, unknown>;
  const prefix = typeof record.prefix === 'string' ? record.prefix : '';
  const number = record.number;
  if (number === null || number === undefined) {
    return '';
  }
  return prefix ? `${prefix}-${String(number)}` : String(number);
};

const readFormula = (formula: unknown): string => {
  if (typeof formula !== 'object' || formula === null) {
    return '';
  }
  const record = formula as Record<string, unknown>;
  switch (record.type) {
    case 'string':
      return typeof record.string === 'string' ? record.string : '';
    case 'number':
      return record.number === null || record.number === undefined
        ? ''
        : String(record.number);
    case 'boolean':
      return record.boolean === true ? '✓' : '✗';
    case 'date':
      return readDateRange(record.date);
    default:
      return '';
  }
};
