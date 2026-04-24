import { PullRequestReview } from '../agent/code-reviewer/domain/code-reviewer.type';
import { DailyPlan, TaskItem } from '../agent/pm/domain/pm-agent.type';
import { DailyReview } from '../agent/work-reviewer/domain/work-reviewer.type';
import {
  formatContextSummary,
  formatDailyPlan,
  formatDailyReview,
  formatPullRequestReview,
} from './slack.service';

const task = (title: string, overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: overrides.id ?? `user:${title}`,
  title,
  source: overrides.source ?? 'USER_INPUT',
  subtasks: overrides.subtasks ?? [],
  isCriticalPath: overrides.isCriticalPath ?? false,
});

describe('formatDailyPlan', () => {
  const base: DailyPlan = {
    topPriority: task('PM Agent 구현 마무리', { isCriticalPath: true }),
    varianceAnalysis: {
      rolledOverTasks: [],
      analysisReasoning: '(이월 없음)',
    },
    morning: [task('크롤러 테스트'), task('prisma schema 검토')],
    afternoon: [task('README 보강'), task('코드 리뷰 2건')],
    blocker: null,
    estimatedHours: 7,
    reasoning: 'impact 기준으로 PM Agent 를 오전 최우선으로 배치',
  };

  it('blocker 가 null 이면 Blocker 라인을 출력하지 않는다', () => {
    const output = formatDailyPlan(base);

    expect(output).toContain('*오늘의 최우선 과제*');
    expect(output).toContain('PM Agent 구현 마무리');
    expect(output).toContain('⚠');
    expect(output).toContain('*오전*');
    expect(output).toContain('• 크롤러 테스트');
    expect(output).toContain('*오후*');
    expect(output).toContain('• README 보강');
    expect(output).toContain('*예상 소요*: 7시간');
    expect(output).toContain('*판단 근거*: impact 기준으로');
    expect(output).not.toContain('*Blocker*');
  });

  it('blocker 가 문자열이면 Blocker 라인을 추가한다', () => {
    const output = formatDailyPlan({
      ...base,
      blocker: '디자인팀 시안 대기',
    });

    expect(output).toContain('*Blocker*: 디자인팀 시안 대기');
  });

  it('morning / afternoon 항목 전체가 bullet 으로 출력된다', () => {
    const output = formatDailyPlan(base);
    const bulletLines = output
      .split('\n')
      .filter((line) => line.startsWith('• '));

    expect(bulletLines).toHaveLength(
      1 + base.morning.length + base.afternoon.length,
    );
  });

  it('morning 배열이 비어 있으면 *오전* 헤더만 남고 bullet 이 없다', () => {
    const output = formatDailyPlan({ ...base, morning: [] });

    const morningSection = output
      .split('\n\n')
      .find((block) => block.startsWith('*오전*'));

    expect(morningSection).toBe('*오전*');
  });
});

describe('formatDailyReview', () => {
  const base: DailyReview = {
    summary: 'PM Agent / Work Reviewer 구현',
    impact: {
      quantitative: ['unit test +12건', 'CLI 격리 범위 +3항목'],
      qualitative: 'prompt-injection 리스크 제거',
    },
    improvementBeforeAfter: {
      before: 'codex 가 parent env/HOME 상속',
      after: 'throwaway HOME + stdin prompt 로 격리',
    },
    nextActions: ['/review-pr 설계', 'Phase 2b GitHub 커넥터 착수'],
    oneLineAchievement: 'codex 어댑터 격리로 secret 유출 경로 차단',
  };

  it('모든 섹션(요약/정량/질적/개선/다음/성과) 을 순서대로 출력한다', () => {
    const output = formatDailyReview(base);

    expect(output).toContain('*오늘 한 일*');
    expect(output).toContain('PM Agent / Work Reviewer 구현');
    expect(output).toContain('*정량 근거*');
    expect(output).toContain('• unit test +12건');
    expect(output).toContain('*질적 영향*');
    expect(output).toContain('*개선 전/후*');
    expect(output).toContain('• Before: codex 가 parent env/HOME 상속');
    expect(output).toContain('• After: throwaway HOME + stdin prompt 로 격리');
    expect(output).toContain('*다음 액션*');
    expect(output).toContain('• /review-pr 설계');
    expect(output).toContain(
      '*한 줄 성과*: codex 어댑터 격리로 secret 유출 경로 차단',
    );
  });

  it('improvementBeforeAfter 가 null 이면 개선 전/후 섹션이 생략된다', () => {
    const output = formatDailyReview({ ...base, improvementBeforeAfter: null });
    expect(output).not.toContain('*개선 전/후*');
  });

  it('impact.quantitative 가 비어있으면 정량 근거 섹션이 생략된다 (근거 부족 케이스)', () => {
    const output = formatDailyReview({
      ...base,
      impact: {
        quantitative: [],
        qualitative: '정량 근거 부족으로 임팩트는 추정 수준',
      },
    });
    expect(output).not.toContain('*정량 근거*');
    expect(output).toContain('*질적 영향*');
    expect(output).toContain('정량 근거 부족으로 임팩트는 추정 수준');
  });

  it('nextActions 가 비어있으면 다음 액션 섹션이 생략된다', () => {
    const output = formatDailyReview({ ...base, nextActions: [] });
    expect(output).not.toContain('*다음 액션*');
  });
});

describe('formatPullRequestReview', () => {
  const base: PullRequestReview = {
    summary: 'GitHub 커넥터 추가',
    riskLevel: 'medium',
    mustFix: ['에러 마스킹 필요'],
    niceToHave: ['주석 보강'],
    missingTests: ['paginate truncated 케이스'],
    reviewCommentDrafts: [
      { file: 'src/x.ts', line: 10, body: '여기 위험' },
      { body: '전반적으로 OK' },
    ],
    approvalRecommendation: 'request_changes',
  };

  it('PR ref / 위험도 / 권고 / 모든 섹션 출력', () => {
    const output = formatPullRequestReview({
      prRef: 'foo/bar#34',
      review: base,
    });

    expect(output).toContain('*PR 리뷰 — foo/bar#34*');
    expect(output).toContain('🟡 MEDIUM');
    expect(output).toContain('✋ Request changes');
    expect(output).toContain('*Must-Fix*');
    expect(output).toContain('• 에러 마스킹 필요');
    expect(output).toContain('*Nice-to-have*');
    expect(output).toContain('*누락 테스트*');
    expect(output).toContain('*리뷰 코멘트 초안*');
    expect(output).toContain('• `src/x.ts:10` 여기 위험');
    expect(output).toContain('• 전반적으로 OK');
  });

  it('빈 섹션은 헤더 자체를 생략', () => {
    const output = formatPullRequestReview({
      prRef: 'foo/bar#1',
      review: {
        ...base,
        mustFix: [],
        niceToHave: [],
        missingTests: [],
        reviewCommentDrafts: [],
      },
    });

    expect(output).not.toContain('*Must-Fix*');
    expect(output).not.toContain('*Nice-to-have*');
    expect(output).not.toContain('*누락 테스트*');
    expect(output).not.toContain('*리뷰 코멘트 초안*');
  });

  it('riskLevel low + approve 라벨 매핑', () => {
    const output = formatPullRequestReview({
      prRef: 'a/b#1',
      review: { ...base, riskLevel: 'low', approvalRecommendation: 'approve' },
    });
    expect(output).toContain('🟢 LOW');
    expect(output).toContain('✅ Approve');
  });

  it('reviewCommentDrafts 의 file/line 누락 시 location prefix 생략', () => {
    const output = formatPullRequestReview({
      prRef: 'a/b#1',
      review: {
        ...base,
        reviewCommentDrafts: [{ body: '단순 코멘트' }],
      },
    });
    expect(output).toContain('• 단순 코멘트');
    expect(output).not.toContain('``');
  });
});

describe('formatContextSummary', () => {
  it('GitHub fetch 성공 시 issue/PR 카운트 라인 출력', () => {
    const output = formatContextSummary({
      github: { fetchSucceeded: true, issueCount: 3, pullRequestCount: 2 },
      notion: { taskCount: 5 },
      slack: { mentionCount: 1, sinceHours: 24 },
      previousPlan: null,
      previousWorklog: null,
    });
    expect(output).toContain('GitHub assigned: issue 3건 / PR 2건');
    expect(output).toContain('Notion task DB: 5건');
    expect(output).toContain('Slack 멘션 (24h): 1건');
  });

  it('GitHub fetch 실패 시 안내 라인 + 토큰 미설정 힌트', () => {
    const output = formatContextSummary({
      github: { fetchSucceeded: false, issueCount: 0, pullRequestCount: 0 },
      notion: { taskCount: 0 },
      slack: { mentionCount: 0, sinceHours: 24 },
      previousPlan: null,
      previousWorklog: null,
    });
    expect(output).toContain('GitHub assigned: 수집 실패');
    expect(output).toContain('GITHUB_TOKEN 미설정 또는 권한 문제');
  });

  it('직전 PM/Work Reviewer 실행 메타가 있으면 # ID + endedAt 표기', () => {
    const output = formatContextSummary({
      github: { fetchSucceeded: true, issueCount: 0, pullRequestCount: 0 },
      notion: { taskCount: 0 },
      slack: { mentionCount: 0, sinceHours: 24 },
      previousPlan: {
        agentRunId: 99,
        endedAt: '2026-04-23T05:00:00.000Z',
      },
      previousWorklog: {
        agentRunId: 100,
        endedAt: '2026-04-23T08:00:00.000Z',
      },
    });
    expect(output).toContain('직전 PM 실행 #99 (2026-04-23T05:00:00.000Z)');
    expect(output).toContain(
      '직전 Work Reviewer 실행 #100 (2026-04-23T08:00:00.000Z)',
    );
  });

  it('직전 실행이 없으면 "없음" 표기', () => {
    const output = formatContextSummary({
      github: { fetchSucceeded: true, issueCount: 0, pullRequestCount: 0 },
      notion: { taskCount: 0 },
      slack: { mentionCount: 0, sinceHours: 24 },
      previousPlan: null,
      previousWorklog: null,
    });
    expect(output).toContain('직전 PM 실행: 없음');
    expect(output).toContain('직전 Work Reviewer 실행: 없음');
  });
});
