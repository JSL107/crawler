import { Injectable } from '@nestjs/common';

import { DailyPlanContextCollector } from './daily-plan-context.collector';

export interface ContextSummary {
  github: {
    fetchSucceeded: boolean;
    issueCount: number;
    pullRequestCount: number;
  };
  notion: {
    taskCount: number;
  };
  slack: {
    mentionCount: number;
    sinceHours: number;
  };
  previousPlan: {
    agentRunId: number;
    endedAt: string;
  } | null;
  previousWorklog: {
    agentRunId: number;
    endedAt: string;
  } | null;
}

// `/sync-context` — Notion/GitHub/Slack/이전 실행 컨텍스트 5종을 재수집해 현재 상태를 요약한다.
// 모델 호출 없음, AgentRun 기록 없음 (가벼운 상태 점검 명령).
// PM `/today` 의 DailyPlanContextCollector 를 그대로 재사용.
@Injectable()
export class SyncContextUsecase {
  constructor(private readonly collector: DailyPlanContextCollector) {}

  async execute({
    slackUserId,
  }: {
    slackUserId: string;
  }): Promise<ContextSummary> {
    const context = await this.collector.collect({
      userText: '',
      slackUserId,
    });

    return {
      github: {
        fetchSucceeded: context.githubTasks !== null,
        issueCount: context.githubTasks?.issues.length ?? 0,
        pullRequestCount: context.githubTasks?.pullRequests.length ?? 0,
      },
      notion: {
        taskCount: context.notionTasks.length,
      },
      slack: {
        mentionCount: context.slackMentions.length,
        sinceHours: 24,
      },
      previousPlan: context.previousPlan
        ? {
            agentRunId: context.previousPlan.agentRunId,
            endedAt: context.previousPlan.endedAt.toISOString(),
          }
        : null,
      previousWorklog: context.previousWorklog
        ? {
            agentRunId: context.previousWorklog.agentRunId,
            endedAt: context.previousWorklog.endedAt.toISOString(),
          }
        : null,
    };
  }
}
