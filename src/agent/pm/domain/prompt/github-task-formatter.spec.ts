import { AssignedTasks } from '../../../../github/domain/github.type';
import { formatGithubTasksAsPromptSection } from './github-task-formatter';

describe('formatGithubTasksAsPromptSection', () => {
  it('issue / PR 모두 markdown 으로 출력하고 라벨/draft 마크 포함', () => {
    const tasks: AssignedTasks = {
      issues: [
        {
          number: 12,
          title: '크롤러 timeout 버그',
          repo: 'foo/bar',
          url: 'https://github.com/foo/bar/issues/12',
          labels: ['bug', 'priority:high'],
          updatedAt: '2026-04-23T05:00:00Z',
        },
      ],
      pullRequests: [
        {
          number: 34,
          title: 'GitHub 커넥터 추가',
          repo: 'foo/bar',
          url: 'https://github.com/foo/bar/pull/34',
          draft: true,
          updatedAt: '2026-04-23T06:00:00Z',
          requestedReviewers: [],
        },
      ],
    };

    const text = formatGithubTasksAsPromptSection(tasks);

    expect(text).toContain('[GitHub 에서 자동 수집한 assigned 항목]');
    expect(text).toContain(
      '- Issue #12 (foo/bar) [bug, priority:high]: 크롤러 timeout 버그',
    );
    expect(text).toContain('- PR #34 (foo/bar) [draft]: GitHub 커넥터 추가');
  });

  it('빈 결과면 명시적 안내 문구를 출력 (model 에게 "GitHub 는 없다" 명시)', () => {
    const text = formatGithubTasksAsPromptSection({
      issues: [],
      pullRequests: [],
    });

    expect(text).toContain('(없음');
    expect(text).toContain('GitHub 호출은 성공했으나');
  });

  it('label / draft 가 없으면 마크 미포함', () => {
    const text = formatGithubTasksAsPromptSection({
      issues: [
        {
          number: 1,
          title: 't',
          repo: 'a/b',
          url: 'u',
          labels: [],
          updatedAt: 'x',
        },
      ],
      pullRequests: [
        {
          number: 2,
          title: 't',
          repo: 'a/b',
          url: 'u',
          draft: false,
          updatedAt: 'x',
          requestedReviewers: [],
        },
      ],
    });

    expect(text).toContain('- Issue #1 (a/b): t');
    expect(text).toContain('- PR #2 (a/b): t');
    expect(text).not.toContain('[draft]');
  });
});
