import { Job } from 'bullmq';

import { GenerateDailyPlanUsecase } from '../../agent/pm/application/generate-daily-plan.usecase';
import { PmAgentException } from '../../agent/pm/domain/pm-agent.exception';
import { DailyPlan } from '../../agent/pm/domain/pm-agent.type';
import { PmAgentErrorCode } from '../../agent/pm/domain/pm-agent-error-code.enum';
import { DomainStatus } from '../../common/exception/domain-status.enum';
import { SlackService } from '../../slack/slack.service';
import { MorningBriefingJobData } from '../domain/morning-briefing.type';
import { MorningBriefingConsumer } from './morning-briefing.consumer';

describe('MorningBriefingConsumer', () => {
  const samplePlan: DailyPlan = {
    topPriority: {
      id: 'user:1',
      title: '오늘의 최우선',
      source: 'USER_INPUT',
      subtasks: [],
      isCriticalPath: true,
    },
    varianceAnalysis: { rolledOverTasks: [], analysisReasoning: '(이월 없음)' },
    morning: [],
    afternoon: [],
    blocker: null,
    estimatedHours: 3,
    reasoning: 'r',
  };

  let generateDailyPlan: jest.Mock;
  let postMessage: jest.Mock;
  let consumer: MorningBriefingConsumer;

  beforeEach(() => {
    generateDailyPlan = jest.fn().mockResolvedValue({
      result: { plan: samplePlan, sources: [] },
      modelUsed: 'codex-cli',
      agentRunId: 99,
    });
    postMessage = jest.fn().mockResolvedValue(undefined);

    consumer = new MorningBriefingConsumer(
      { execute: generateDailyPlan } as unknown as GenerateDailyPlanUsecase,
      { postMessage } as unknown as SlackService,
    );
  });

  const buildJob = (
    data: MorningBriefingJobData,
  ): Job<MorningBriefingJobData> => ({ data }) as Job<MorningBriefingJobData>;

  it('GenerateDailyPlanUsecase 를 owner ID + 빈 텍스트 + MORNING_BRIEFING_CRON triggerType 으로 호출', async () => {
    await consumer.process(buildJob({ ownerSlackUserId: 'U1', target: 'C99' }));
    expect(generateDailyPlan).toHaveBeenCalledWith({
      tasksText: '',
      slackUserId: 'U1',
      triggerType: 'MORNING_BRIEFING_CRON',
    });
  });

  it('SlackService.postMessage 를 target + (formatDailyPlan + footer) 텍스트로 호출', async () => {
    await consumer.process(buildJob({ ownerSlackUserId: 'U1', target: 'C99' }));
    expect(postMessage).toHaveBeenCalledTimes(1);
    const [{ target, text }] = postMessage.mock.calls[0];
    expect(target).toBe('C99');
    expect(text).toContain('*오늘의 최우선 과제*');
    expect(text).toContain('오늘의 최우선');
    // PRO-3 푸터 — modelUsed / agentRunId
    expect(text).toContain('codex-cli');
    expect(text).toContain('run #99');
  });

  it('EMPTY_TASKS_INPUT 은 retry 안 하고 친절 메시지로 graceful 마감', async () => {
    generateDailyPlan.mockRejectedValue(
      new PmAgentException({
        code: PmAgentErrorCode.EMPTY_TASKS_INPUT,
        message: 'empty',
        status: DomainStatus.BAD_REQUEST,
      }),
    );
    await expect(
      consumer.process(buildJob({ ownerSlackUserId: 'U1', target: 'U1' })),
    ).resolves.toBeUndefined();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][0].text).toContain(
      '자동 수집된 할 일이 없습니다',
    );
  });

  it('Plan 생성 transient 실패 시 예외 propagate (BullMQ retry 위임)', async () => {
    generateDailyPlan.mockRejectedValue(new Error('boom'));
    await expect(
      consumer.process(buildJob({ ownerSlackUserId: 'U1', target: 'U1' })),
    ).rejects.toThrow('boom');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('Slack 발송 실패 시 예외 propagate', async () => {
    postMessage.mockRejectedValue(new Error('not_in_channel'));
    await expect(
      consumer.process(buildJob({ ownerSlackUserId: 'U1', target: 'C99' })),
    ).rejects.toThrow('not_in_channel');
  });
});
