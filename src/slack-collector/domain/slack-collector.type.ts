// 사용자에게 멘션된 Slack 메시지 한 건 — PM Agent 가 "blocker 후보" 로 모델에 넘긴다.
export interface SlackMention {
  channelId: string;
  channelName: string | undefined; // DM/IM 은 name 없음
  channelType: 'public_channel' | 'private_channel' | 'im' | 'mpim';
  authorUserId: string | undefined;
  ts: string; // Slack timestamp ("1730000000.000100")
  text: string;
  permalink: string | undefined;
}
