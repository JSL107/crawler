import { AgentType } from '../../../model-router/domain/model-router.type';
import { AgentRunStatus, EvidenceInput, TriggerType } from '../agent-run.type';

export const AGENT_RUN_REPOSITORY_PORT = Symbol('AGENT_RUN_REPOSITORY_PORT');

export interface BeginAgentRunInput {
  agentType: AgentType;
  triggerType: TriggerType;
  // JSON 직렬화 가능한 임의 데이터. Prisma 저장 경계에서만 InputJsonValue 로 cast.
  inputSnapshot: unknown;
}

export interface FinishAgentRunInput {
  id: number;
  status: AgentRunStatus;
  modelUsed?: string;
  output?: unknown;
}

export interface SucceededAgentRunSnapshot {
  id: number;
  output: unknown;
  endedAt: Date;
}

export interface AgentRunRepositoryPort {
  begin(input: BeginAgentRunInput): Promise<{ id: number }>;
  finish(input: FinishAgentRunInput): Promise<void>;
  recordEvidence(input: { agentRunId: number } & EvidenceInput): Promise<void>;
  // slackUserId 명시 시 inputSnapshot.slackUserId 와 매칭되는 run 만 검색.
  // /po-shadow 같은 사용자 한정 명령이 다른 사용자 run 을 잡지 않도록 (codex review b6xkjewd2 P2).
  findLatestSucceededRun(input: {
    agentType: AgentType;
    slackUserId?: string;
  }): Promise<SucceededAgentRunSnapshot | null>;
}
