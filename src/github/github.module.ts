import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

import { ListAssignedTasksUsecase } from './application/list-assigned-tasks.usecase';
import {
  GITHUB_CLIENT_PORT,
  OCTOKIT_INSTANCE,
} from './domain/port/github-client.port';
import { OctokitGithubClient } from './infrastructure/octokit-github.client';

@Module({
  providers: [
    ListAssignedTasksUsecase,
    {
      // Octokit 인스턴스를 factory 로 주입 — 테스트 시 mock 으로 교체 가능.
      // GITHUB_TOKEN 이 없으면 null 을 주입하고, OctokitGithubClient 가 호출 시점에 친절한 예외를 던진다.
      provide: OCTOKIT_INSTANCE,
      useFactory: (configService: ConfigService): Octokit | null => {
        const token = configService.get<string>('GITHUB_TOKEN');
        if (!token) {
          return null;
        }
        return new Octokit({ auth: token });
      },
      inject: [ConfigService],
    },
    {
      provide: GITHUB_CLIENT_PORT,
      useClass: OctokitGithubClient,
    },
  ],
  exports: [ListAssignedTasksUsecase],
})
export class GithubModule {}
