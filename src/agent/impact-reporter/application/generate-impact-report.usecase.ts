import { Inject, Injectable, Logger } from '@nestjs/common';

import { AgentRunService } from '../../../agent-run/application/agent-run.service';
import { TriggerType } from '../../../agent-run/domain/agent-run.type';
import { DomainStatus } from '../../../common/exception/domain-status.enum';
import {
  GITHUB_CLIENT_PORT,
  GithubClientPort,
  PullRequestRef,
} from '../../../github/domain/port/github-client.port';
import { ModelRouterUsecase } from '../../../model-router/application/model-router.usecase';
import { AgentType } from '../../../model-router/domain/model-router.type';
import { parsePrReference } from '../../code-reviewer/domain/pr-reference.parser';
import { ImpactReporterException } from '../domain/impact-reporter.exception';
import {
  GenerateImpactReportInput,
  ImpactReport,
} from '../domain/impact-reporter.type';
import { ImpactReporterErrorCode } from '../domain/impact-reporter-error-code.enum';
import { parseImpactReport } from '../domain/prompt/impact-report.parser';
import { IMPACT_REPORTER_SYSTEM_PROMPT } from '../domain/prompt/impact-reporter-system.prompt';

// PR detail body/diff 가 길면 prompt 가 폭발하므로 head 만 자른다 (16KB UTF-8 = 약 4-8K 토큰).
const PR_BODY_MAX_BYTES = 4_000;

@Injectable()
export class GenerateImpactReportUsecase {
  private readonly logger = new Logger(GenerateImpactReportUsecase.name);

  constructor(
    private readonly modelRouter: ModelRouterUsecase,
    private readonly agentRunService: AgentRunService,
    @Inject(GITHUB_CLIENT_PORT)
    private readonly githubClient: GithubClientPort,
  ) {}

  async execute({
    subject,
    slackUserId,
  }: GenerateImpactReportInput): Promise<ImpactReport> {
    const trimmed = subject.trim();
    if (trimmed.length === 0) {
      throw new ImpactReporterException({
        code: ImpactReporterErrorCode.EMPTY_SUBJECT,
        message:
          '분석 대상이 비어 있습니다. `/impact-report <PR 링크 / task 설명>` 형식으로 입력해주세요.',
        status: DomainStatus.BAD_REQUEST,
      });
    }

    // PR ref 패턴 (URL / shorthand) 이면 GitHub 에서 PR 컨텍스트 fetch — codex review b6xkjewd2 P2.
    // graceful: GITHUB_TOKEN 미설정 / PR 접근 권한 부족 등은 자유 텍스트 fallback.
    const prRef = tryParsePrReference(trimmed);
    const prContext = prRef ? await this.fetchPrContextOrNull(prRef) : null;
    const prompt = buildPrompt({ subject: trimmed, prContext });

    return this.agentRunService.execute({
      agentType: AgentType.IMPACT_REPORTER,
      triggerType: TriggerType.SLACK_COMMAND_IMPACT_REPORT,
      inputSnapshot: {
        subject: trimmed,
        slackUserId,
        prGroundingAttempted: prRef !== null,
        prGroundingSucceeded: prContext !== null,
      },
      evidence: [
        {
          sourceType: 'SLACK_COMMAND_IMPACT_REPORT',
          sourceId: slackUserId,
          payload: { subject: trimmed },
        },
        ...(prContext
          ? [
              {
                sourceType: 'GITHUB_PR_DETAIL' as const,
                sourceId: `${prContext.repo}#${prContext.number}`,
                payload: {
                  title: prContext.title,
                  body: prContext.body,
                  url: prContext.url,
                },
              },
            ]
          : []),
      ],
      run: async () => {
        const completion = await this.modelRouter.route({
          agentType: AgentType.IMPACT_REPORTER,
          request: { prompt, systemPrompt: IMPACT_REPORTER_SYSTEM_PROMPT },
        });
        const report = parseImpactReport(completion.text);
        return {
          result: report,
          modelUsed: completion.modelUsed,
          output: report,
        };
      },
    });
  }

  private async fetchPrContextOrNull(
    ref: PullRequestRef,
  ): Promise<PrContext | null> {
    try {
      const detail = await this.githubClient.getPullRequest(ref);
      return {
        repo: ref.repo,
        number: ref.number,
        title: detail.title,
        body: truncateUtf8(detail.body ?? '', PR_BODY_MAX_BYTES),
        url: detail.url,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `GitHub PR ${ref.repo}#${ref.number} 조회 실패 (자유 텍스트로 fallback): ${message}`,
      );
      return null;
    }
  }
}

interface PrContext {
  repo: string;
  number: number;
  title: string;
  body: string;
  url: string;
}

const tryParsePrReference = (raw: string) => {
  try {
    return parsePrReference(raw);
  } catch {
    return null;
  }
};

const buildPrompt = ({
  subject,
  prContext,
}: {
  subject: string;
  prContext: PrContext | null;
}): string => {
  if (!prContext) {
    return subject;
  }
  return [
    `[분석 대상]`,
    subject,
    '',
    `[GitHub PR ${prContext.repo}#${prContext.number}]`,
    `URL: ${prContext.url}`,
    `Title: ${prContext.title}`,
    '',
    `Body:`,
    prContext.body.length > 0 ? prContext.body : '(본문 없음)',
  ].join('\n');
};

// PR body 가 매우 긴 경우 (수천 자) prompt 폭발 방지.
const truncateUtf8 = (text: string, maxBytes: number): string => {
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return text;
  }
  const sliced = buffer
    .subarray(0, maxBytes)
    .toString('utf8')
    .replace(/�$/, '');
  return `${sliced}\n... (생략됨 — PR body cap ${maxBytes} bytes)`;
};
