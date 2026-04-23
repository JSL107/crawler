import { Octokit } from '@octokit/rest';

import { GithubErrorCode } from '../domain/github-error-code.enum';
import { GithubException } from '../domain/github.exception';
import { OctokitGithubClient } from './octokit-github.client';

describe('OctokitGithubClient', () => {
  const buildOctokitMock = (items: Array<Record<string, unknown>>): Octokit =>
    ({
      rest: {
        search: {
          issuesAndPullRequests: jest
            .fn()
            .mockResolvedValue({ data: { items } }),
        },
      },
    }) as unknown as Octokit;

  it('Octokit 인스턴스가 null 이면 TOKEN_NOT_CONFIGURED 예외', async () => {
    const client = new OctokitGithubClient(null);

    await expect(client.listMyAssignedTasks()).rejects.toMatchObject({
      githubErrorCode: GithubErrorCode.TOKEN_NOT_CONFIGURED,
    });
  });

  it('search 응답을 issues / pullRequests 로 분리한다', async () => {
    const octokit = buildOctokitMock([
      {
        number: 12,
        title: 'Bug: 크롤러 timeout',
        html_url: 'https://github.com/foo/bar/issues/12',
        repository_url: 'https://api.github.com/repos/foo/bar',
        updated_at: '2026-04-23T05:00:00Z',
        labels: [{ name: 'bug' }, 'priority:high'],
      },
      {
        number: 34,
        title: 'PR: GitHub 커넥터 추가',
        html_url: 'https://github.com/foo/bar/pull/34',
        repository_url: 'https://api.github.com/repos/foo/bar',
        updated_at: '2026-04-23T06:00:00Z',
        pull_request: { url: '...' },
        draft: true,
      },
    ]);
    const client = new OctokitGithubClient(octokit);

    const result = await client.listMyAssignedTasks();

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      number: 12,
      repo: 'foo/bar',
      labels: ['bug', 'priority:high'],
    });

    expect(result.pullRequests).toHaveLength(1);
    expect(result.pullRequests[0]).toMatchObject({
      number: 34,
      draft: true,
      repo: 'foo/bar',
    });
  });

  it('search 호출이 throw 하면 REQUEST_FAILED 예외로 감싼다', async () => {
    const octokit = {
      rest: {
        search: {
          issuesAndPullRequests: jest
            .fn()
            .mockRejectedValue(new Error('rate limit')),
        },
      },
    } as unknown as Octokit;
    const client = new OctokitGithubClient(octokit);

    await expect(client.listMyAssignedTasks()).rejects.toBeInstanceOf(
      GithubException,
    );
  });

  it('limit 은 100 으로 cap 되어 per_page 에 전달된다', async () => {
    const search = jest.fn().mockResolvedValue({ data: { items: [] } });
    const octokit = {
      rest: { search: { issuesAndPullRequests: search } },
    } as unknown as Octokit;
    const client = new OctokitGithubClient(octokit);

    await client.listMyAssignedTasks({ limit: 999 });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 100 }),
    );
  });
});
