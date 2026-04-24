import { Injectable } from '@nestjs/common';

import { EvidenceInput } from '../../../agent-run/domain/agent-run.type';
import {
  DailyPlanContext,
  SLACK_MENTION_SINCE_HOURS,
} from './daily-plan-context.collector';

// DailyPlanContext → AgentRun 에 기록할 EvidenceInput 배열.
// source 추가 시 여기 한 곳에서 대응 (OCP).
@Injectable()
export class DailyPlanEvidenceBuilder {
  build(context: DailyPlanContext): EvidenceInput[] {
    const {
      userText,
      slackUserId,
      githubTasks,
      previousPlan,
      previousWorklog,
      slackMentions,
      notionTasks,
    } = context;

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
    if (previousPlan) {
      evidence.push({
        sourceType: 'PRIOR_DAILY_PLAN',
        sourceId: String(previousPlan.agentRunId),
        payload: {
          plan: previousPlan.plan,
          endedAt: previousPlan.endedAt.toISOString(),
        },
      });
    }
    if (previousWorklog) {
      evidence.push({
        sourceType: 'PRIOR_DAILY_REVIEW',
        sourceId: String(previousWorklog.agentRunId),
        payload: {
          review: previousWorklog.review,
          endedAt: previousWorklog.endedAt.toISOString(),
        },
      });
    }
    if (slackMentions.length > 0) {
      evidence.push({
        sourceType: 'SLACK_MENTIONS',
        sourceId: slackUserId,
        payload: {
          sinceHours: SLACK_MENTION_SINCE_HOURS,
          mentions: slackMentions,
        },
      });
    }
    if (notionTasks.length > 0) {
      evidence.push({
        sourceType: 'NOTION_TASKS',
        sourceId: 'me',
        payload: {
          tasks: notionTasks,
        },
      });
    }
    return evidence;
  }
}
