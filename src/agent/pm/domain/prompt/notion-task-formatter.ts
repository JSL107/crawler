import { NotionTask } from '../../../../notion/domain/notion.type';

export const MAX_NOTION_ITEMS = 30;

export interface NotionFormatResult {
  content: string;
  truncatedCount: number;
}

// Notion task DB 의 row 들을 PM prompt section 으로 변환.
// 속성 schema 는 DB 마다 달라서 generic 표기 — title 강조 + 모든 non-empty property 를 콤마 구분으로.
// 항목 수가 maxItems 초과 시 앞에서부터만 표기하고 나머지는 "(+N건 생략)" 으로 cap (prompt context overflow 방어).
export const formatNotionTasksAsPromptSection = (
  tasks: NotionTask[],
  options: { maxItems?: number } = {},
): NotionFormatResult => {
  const maxItems = options.maxItems ?? MAX_NOTION_ITEMS;
  const lines: string[] = ['[Notion task DB 의 항목]'];

  if (tasks.length === 0) {
    lines.push('(없음 — DB 가 비었거나 권한 부여 안 된 DB)');
    return { content: lines.join('\n'), truncatedCount: 0 };
  }

  const visible = tasks.slice(0, maxItems);
  const truncatedCount = Math.max(0, tasks.length - maxItems);

  for (const task of visible) {
    const propsLine = formatPropertiesInline(task.properties);
    const propsTail = propsLine ? ` — ${propsLine}` : '';
    lines.push(`- "${task.title}"${propsTail}`);
  }

  if (truncatedCount > 0) {
    lines.push(
      `(+${truncatedCount}건 생략 — 총 ${tasks.length}건 중 ${maxItems}건만 표기)`,
    );
  }

  return { content: lines.join('\n'), truncatedCount };
};

const formatPropertiesInline = (properties: Record<string, string>): string => {
  const entries = Object.entries(properties).filter(
    ([, value]) => value && value.length > 0,
  );
  if (entries.length === 0) {
    return '';
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
};
