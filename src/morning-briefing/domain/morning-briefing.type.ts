// PRO-1 Morning Briefing — BullMQ Queue 이름 / Job payload 정의.
// PmAgent / Slack 발송 책임을 분리한 별도 도메인 (Application/Infrastructure 양 계층 모두 공통 참조).
export const MORNING_BRIEFING_QUEUE = 'morning-briefing';

// CRON 으로 트리거되는 단위 작업의 payload.
// - ownerSlackUserId: PM Agent 가 GitHub/Slack 멘션을 fetch 할 때 사용 (PM context 의 owner).
// - target: 응답 발송 대상 (slack user ID `U...` / channel ID `C.../G...`).
export interface MorningBriefingJobData {
  ownerSlackUserId: string;
  target: string;
}

// 기본 cron — 매일 08:30. KST 기준 해석은 TIMEZONE env (기본 Asia/Seoul) 가 책임.
export const DEFAULT_MORNING_BRIEFING_CRON = '30 8 * * *';
export const DEFAULT_MORNING_BRIEFING_TIMEZONE = 'Asia/Seoul';
