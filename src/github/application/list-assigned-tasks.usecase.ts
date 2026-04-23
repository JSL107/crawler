import { Inject, Injectable } from '@nestjs/common';

import { AssignedTasks } from '../domain/github.type';
import {
  GITHUB_CLIENT_PORT,
  GithubClientPort,
  ListAssignedTasksOptions,
} from '../domain/port/github-client.port';

// 사용자에게 assigned 된 open issue/PR 을 GitHub 에서 한 번에 조회한다.
// PM Agent 의 `/today` 에서 자동 evidence 수집 입력으로 활용 (Phase 2b).
@Injectable()
export class ListAssignedTasksUsecase {
  constructor(
    @Inject(GITHUB_CLIENT_PORT)
    private readonly githubClient: GithubClientPort,
  ) {}

  async execute(options?: ListAssignedTasksOptions): Promise<AssignedTasks> {
    return this.githubClient.listMyAssignedTasks(options);
  }
}
