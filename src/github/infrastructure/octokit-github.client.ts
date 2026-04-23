import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

import { GithubErrorCode } from '../domain/github-error-code.enum';
import { GithubException } from '../domain/github.exception';
import {
  AssignedTasks,
  GithubIssue,
  GithubPullRequest,
} from '../domain/github.type';
import {
  GithubClientPort,
  ListAssignedTasksOptions,
  OCTOKIT_INSTANCE,
} from '../domain/port/github-client.port';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

@Injectable()
export class OctokitGithubClient implements GithubClientPort {
  constructor(
    @Inject(OCTOKIT_INSTANCE) private readonly octokit: Octokit | null,
  ) {}

  async listMyAssignedTasks({
    limit = DEFAULT_LIMIT,
  }: ListAssignedTasksOptions = {}): Promise<AssignedTasks> {
    if (!this.octokit) {
      throw new GithubException({
        code: GithubErrorCode.TOKEN_NOT_CONFIGURED,
        message:
          'GITHUB_TOKEN 이 .env 에 설정되지 않아 GitHub API 를 호출할 수 없습니다.',
        status: HttpStatus.PRECONDITION_FAILED,
      });
    }

    const perPage = Math.min(limit, MAX_LIMIT);

    const response = await this.invokeSearch(perPage);

    const issues: GithubIssue[] = [];
    const pullRequests: GithubPullRequest[] = [];
    for (const item of response.data.items) {
      if (item.pull_request) {
        pullRequests.push(this.toPullRequest(item));
      } else {
        issues.push(this.toIssue(item));
      }
    }

    return { issues, pullRequests };
  }

  private async invokeSearch(perPage: number) {
    try {
      // assignee:@me 는 인증된 사용자에게 할당된 모든 open issue/PR 을 한 번에 조회한다.
      // PR 도 GitHub API 상 issue 의 일종이라 search/issues 엔드포인트로 함께 받는다.
      return await this.octokit!.rest.search.issuesAndPullRequests({
        q: 'assignee:@me state:open',
        per_page: perPage,
        sort: 'updated',
        order: 'desc',
      });
    } catch (error: unknown) {
      throw new GithubException({
        code: GithubErrorCode.REQUEST_FAILED,
        message: `GitHub API 호출 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        cause: error,
      });
    }
  }

  private toIssue(item: SearchItem): GithubIssue {
    return {
      number: item.number,
      title: item.title,
      repo: extractRepo(item.repository_url),
      url: item.html_url,
      labels: extractLabels(item.labels),
      updatedAt: item.updated_at,
      body: item.body ?? undefined,
    };
  }

  private toPullRequest(item: SearchItem): GithubPullRequest {
    return {
      number: item.number,
      title: item.title,
      repo: extractRepo(item.repository_url),
      url: item.html_url,
      draft: item.draft ?? false,
      updatedAt: item.updated_at,
      requestedReviewers: [],
    };
  }
}

// search.issuesAndPullRequests 응답 item 의 구조 (필요한 필드만 추출).
type SearchItem = {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  body?: string | null;
  draft?: boolean;
  pull_request?: unknown;
  labels?: Array<{ name?: string } | string>;
};

const extractRepo = (repositoryUrl: string): string => {
  // repository_url 예: https://api.github.com/repos/owner/repo
  const match = repositoryUrl.match(/\/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : repositoryUrl;
};

const extractLabels = (labels: SearchItem['labels']): string[] => {
  if (!Array.isArray(labels)) {
    return [];
  }
  const out: string[] = [];
  for (const label of labels) {
    if (typeof label === 'string') {
      out.push(label);
    } else if (label && typeof label.name === 'string') {
      out.push(label.name);
    }
  }
  return out;
};
