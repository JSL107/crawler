import { SlackMention } from '../../../../slack-collector/domain/slack-collector.type';

const MAX_TEXT_LENGTH = 240;

// 사용자에게 멘션된 최근 Slack 메시지를 PM 모델에게 "blocker 후보" 로 보여주는 섹션.
// "이 멘션이 정말 blocker 인지" 판단은 모델에게 위임 (사용자 입력 / 어제 plan / GitHub task 와 함께 종합 판단).
export const formatSlackMentionsAsPromptSection = ({
  mentions,
  sinceHours,
}: {
  mentions: SlackMention[];
  sinceHours: number;
}): string => {
  const lines: string[] = [
    `[Slack 에서 본인 멘션된 최근 메시지 (${sinceHours}h, blocker 후보)]`,
  ];

  if (mentions.length === 0) {
    lines.push('(없음)');
    return lines.join('\n');
  }

  for (const mention of mentions) {
    const channel = formatChannelLabel(mention);
    const author = mention.authorUserId ? `<@${mention.authorUserId}>` : '?';
    const snippet = truncate(mention.text, MAX_TEXT_LENGTH);
    lines.push(`- [${channel}] ${author}: ${snippet}`);
  }

  return lines.join('\n');
};

const formatChannelLabel = (mention: SlackMention): string => {
  if (mention.channelType === 'im') {
    return 'DM';
  }
  if (mention.channelType === 'mpim') {
    return 'group DM';
  }
  if (mention.channelName) {
    const prefix = mention.channelType === 'private_channel' ? '🔒' : '#';
    return `${prefix}${mention.channelName}`;
  }
  return mention.channelId;
};

const truncate = (text: string, max: number): string => {
  // 줄바꿈을 한 칸 공백으로 정리 (prompt 섹션이 줄로 분할되니까).
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) {
    return flat;
  }
  return `${flat.slice(0, max)}…`;
};
