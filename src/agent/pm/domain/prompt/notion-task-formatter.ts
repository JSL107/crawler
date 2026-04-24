import { NotionTask } from '../../../../notion/domain/notion.type';

// Notion task DB 의 row 들을 PM prompt section 으로 변환.
// 속성 schema 는 DB 마다 달라서 generic 표기 — title 강조 + 모든 non-empty property 를 콤마 구분으로.
export const formatNotionTasksAsPromptSection = (
  tasks: NotionTask[],
): string => {
  const lines: string[] = ['[Notion task DB 의 항목]'];

  if (tasks.length === 0) {
    lines.push('(없음 — DB 가 비었거나 권한 부여 안 된 DB)');
    return lines.join('\n');
  }

  for (const task of tasks) {
    const propsLine = formatPropertiesInline(task.properties);
    const propsTail = propsLine ? ` — ${propsLine}` : '';
    lines.push(`- "${task.title}"${propsTail}`);
  }

  return lines.join('\n');
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
