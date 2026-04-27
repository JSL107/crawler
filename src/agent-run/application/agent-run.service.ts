import { Inject, Injectable, Logger } from '@nestjs/common';

import { AgentType } from '../../model-router/domain/model-router.type';
import {
  AgentRunStatus,
  EvidenceInput,
  TriggerType,
} from '../domain/agent-run.type';
import {
  AGENT_RUN_REPOSITORY_PORT,
  AgentRunRepositoryPort,
  SucceededAgentRunSnapshot,
} from '../domain/port/agent-run.repository.port';

export interface AgentRunExecutionResult<T> {
  result: T;
  modelUsed: string;
  // output 은 JSON 직렬화 가능한 임의 데이터 — domain 객체 그대로 전달 가능.
  // Prisma 저장 경계에서만 InputJsonValue 로 cast.
  output: unknown;
}

export interface AgentRunContext {
  agentRunId: number;
}

export interface ExecuteAgentRunInput<T> {
  agentType: AgentType;
  triggerType: TriggerType;
  inputSnapshot: unknown;
  evidence?: EvidenceInput[];
  run: (context: AgentRunContext) => Promise<AgentRunExecutionResult<T>>;
}

// execute 의 외부 노출 형태 — 도메인 결과(result) 와 라우팅 메타(modelUsed/agentRunId) 분리.
// SlackService formatter 가 footer 렌더링에 modelUsed/agentRunId 를 사용하고 (PRO-3),
// 후속 OPS-1 Quota Pane 도 동일 outcome 을 재활용한다.
export interface AgentRunOutcome<T> {
  result: T;
  modelUsed: string;
  agentRunId: number;
}

// 모든 에이전트 유스케이스가 공유할 AgentRun 라이프사이클 템플릿.
// begin → run → finish(SUCCEEDED|FAILED) 순서를 강제하고 EvidenceRecord 기록까지 캡슐화한다.
// 기획서 §8 증거 기반 운영 원칙: 모든 에이전트 실행은 DB 에 흔적과 근거를 남겨야 한다.
@Injectable()
export class AgentRunService {
  private readonly logger = new Logger(AgentRunService.name);

  constructor(
    @Inject(AGENT_RUN_REPOSITORY_PORT)
    private readonly repository: AgentRunRepositoryPort,
  ) {}

  async execute<T>({
    agentType,
    triggerType,
    inputSnapshot,
    evidence,
    run,
  }: ExecuteAgentRunInput<T>): Promise<AgentRunOutcome<T>> {
    const { id } = await this.repository.begin({
      agentType,
      triggerType,
      inputSnapshot,
    });

    // evidence loop 을 try 안에 둬서 recordEvidence 가 throw 하더라도 AgentRun 이 IN_PROGRESS 에 고착되지 않도록 한다.
    try {
      for (const entry of evidence ?? []) {
        await this.repository.recordEvidence({ agentRunId: id, ...entry });
      }

      const execution = await run({ agentRunId: id });

      await this.repository.finish({
        id,
        status: AgentRunStatus.SUCCEEDED,
        modelUsed: execution.modelUsed,
        output: execution.output,
      });

      return {
        result: execution.result,
        modelUsed: execution.modelUsed,
        agentRunId: id,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `AgentRun #${id} (${agentType}) 실패: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.repository.finish({
        id,
        status: AgentRunStatus.FAILED,
        output: { error: message },
      });

      throw error;
    }
  }

  // 가장 최근 SUCCEEDED AgentRun 1건 조회. slackUserId 옵셔널 — 명시 시 inputSnapshot.slackUserId 매칭.
  async findLatestSucceededRun({
    agentType,
    slackUserId,
  }: {
    agentType: AgentType;
    slackUserId?: string;
  }): Promise<SucceededAgentRunSnapshot | null> {
    return this.repository.findLatestSucceededRun({ agentType, slackUserId });
  }
}
