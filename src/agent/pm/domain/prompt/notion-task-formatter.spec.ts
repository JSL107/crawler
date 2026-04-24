import { NotionTask } from '../../../../notion/domain/notion.type';
import { formatNotionTasksAsPromptSection } from './notion-task-formatter';

describe('formatNotionTasksAsPromptSection', () => {
  it('빈 배열이면 (없음) 안내 + 헤더', () => {
    const text = formatNotionTasksAsPromptSection([]);
    expect(text).toContain('[Notion task DB 의 항목]');
    expect(text).toContain('(없음');
  });

  it('각 task 를 "title" — key: value, ... 형식으로 출력', () => {
    const tasks: NotionTask[] = [
      {
        databaseId: 'DB1',
        pageId: 'p1',
        url: 'u1',
        title: '버그 수정',
        properties: {
          상태: '진행중',
          우선순위: '높음',
          담당자: '김준석',
        },
      },
      {
        databaseId: 'DB1',
        pageId: 'p2',
        url: 'u2',
        title: '문서 정리',
        properties: { 상태: 'Backlog' },
      },
    ];

    const text = formatNotionTasksAsPromptSection(tasks);

    expect(text).toContain(
      '- "버그 수정" — 상태: 진행중, 우선순위: 높음, 담당자: 김준석',
    );
    expect(text).toContain('- "문서 정리" — 상태: Backlog');
  });

  it('properties 가 모두 빈 값이면 dash 부분 생략', () => {
    const tasks: NotionTask[] = [
      {
        databaseId: 'DB1',
        pageId: 'p1',
        url: 'u',
        title: '제목만 있음',
        properties: {},
      },
    ];

    const text = formatNotionTasksAsPromptSection(tasks);
    expect(text).toContain('- "제목만 있음"');
    expect(text).not.toContain('"제목만 있음" —');
  });

  it('properties 중 빈 string 값은 무시', () => {
    const tasks: NotionTask[] = [
      {
        databaseId: 'DB1',
        pageId: 'p1',
        url: 'u',
        title: 't',
        properties: { 상태: '진행중', 메모: '', 우선순위: '높음' },
      },
    ];

    const text = formatNotionTasksAsPromptSection(tasks);
    expect(text).toContain('상태: 진행중, 우선순위: 높음');
    expect(text).not.toContain('메모:');
  });
});
