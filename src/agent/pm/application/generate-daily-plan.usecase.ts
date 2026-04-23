import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AgentRunService } from '../../../agent-run/application/agent-run.service';
import {
  EvidenceInput,
  TriggerType,
} from '../../../agent-run/domain/agent-run.type';
import { ListAssignedTasksUsecase } from '../../../github/application/list-assigned-tasks.usecase';
import { AssignedTasks } from '../../../github/domain/github.type';
import { ModelRouterUsecase } from '../../../model-router/application/model-router.usecase';
import { AgentType } from '../../../model-router/domain/model-router.type';
import { PmAgentErrorCode } from '../domain/pm-agent-error-code.enum';
import { PmAgentException } from '../domain/pm-agent.exception';
import { DailyPlan, GenerateDailyPlanInput } from '../domain/pm-agent.type';
import { parseDailyPlan } from '../domain/prompt/daily-plan.parser';
import { formatGithubTasksAsPromptSection } from '../domain/prompt/github-task-formatter';
import { PM_SYSTEM_PROMPT } from '../domain/prompt/pm-system.prompt';

@Injectable()
export class GenerateDailyPlanUsecase {
  private readonly logger = new Logger(GenerateDailyPlanUsecase.name);

  constructor(
    private readonly modelRouter: ModelRouterUsecase,
    private readonly agentRunService: AgentRunService,
    private readonly listAssignedTasksUsecase: ListAssignedTasksUsecase,
  ) {}

  async execute({
    tasksText,
    slackUserId,
  }: GenerateDailyPlanInput): Promise<DailyPlan> {
    const userText = tasksText.trim();

    // GitHub 호출은 graceful — 실패해도 사용자 입력만으로 계속 진행한다.
    // 단 사용자 입력도 비어 있고 GitHub 도 비어 있으면 EMPTY 예외.
    const githubTasks = await this.fetchGithubTasksOrNull();
    const githubItemCount = githubTasks
      ? githubTasks.issues.length + githubTasks.pullRequests.length
      : 0;

    if (userText.length === 0 && githubItemCount === 0) {
      throw new PmAgentException({
        code: PmAgentErrorCode.EMPTY_TASKS_INPUT,
        message:
          '오늘 할 일이 비어있고 GitHub 자동 수집도 비어있습니다. `/today <할 일>` 형식으로 입력하거나 GITHUB_TOKEN 을 설정해주세요.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const combinedPrompt = this.buildCombinedPrompt({ userText, githubTasks });
    const evidence = this.buildEvidence({
      userText,
      slackUserId,
      githubTasks,
    });

    return this.agentRunService.execute({
      agentType: AgentType.PM,
      triggerType: TriggerType.SLACK_COMMAND_TODAY,
      inputSnapshot: {
        tasksText: userText,
        slackUserId,
        githubItemCount,
        githubFetchAttempted: true,
        githubFetchSucceeded: githubTasks !== null,
      },
      evidence,
      run: async () => {
        const completion = await this.modelRouter.route({
          agentType: AgentType.PM,
          request: {
            prompt: combinedPrompt,
            systemPrompt: PM_SYSTEM_PROMPT,
          },
        });
        const plan = parseDailyPlan(completion.text);
        return {
          result: plan,
          modelUsed: completion.modelUsed,
          output: plan as unknown as Record<string, unknown>,
        };
      },
    });
  }

  private async fetchGithubTasksOrNull(): Promise<AssignedTasks | null> {
    try {
      return await this.listAssignedTasksUsecase.execute();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `GitHub assigned tasks 수집 실패 (사용자 입력만으로 계속 진행): ${message}`,
      );
      return null;
    }
  }

  private buildCombinedPrompt({
    userText,
    githubTasks,
  }: {
    userText: string;
    githubTasks: AssignedTasks | null;
  }): string {
    const sections: string[] = [];
    if (userText.length > 0) {
      sections.push(`[사용자 입력]\n${userText}`);
    }
    if (githubTasks) {
      sections.push(formatGithubTasksAsPromptSection(githubTasks));
    }
    return sections.join('\n\n');
  }

  private buildEvidence({
    userText,
    slackUserId,
    githubTasks,
  }: {
    userText: string;
    slackUserId: string;
    githubTasks: AssignedTasks | null;
  }): EvidenceInput[] {
    const evidence: EvidenceInput[] = [
      {
        sourceType: 'SLACK_COMMAND_TODAY',
        sourceId: slackUserId,
        payload: { tasksText: userText },
      },
    ];
    if (githubTasks) {
      evidence.push({
        sourceType: 'GITHUB_ASSIGNED_TASKS',
        sourceId: 'me',
        payload: {
          issues: githubTasks.issues,
          pullRequests: githubTasks.pullRequests,
        },
      });
    }
    return evidence;
  }
}
