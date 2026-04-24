import { match, P } from 'ts-pattern';

import { SlackMention } from '../../../../slack-collector/domain/slack-collector.type';

const MAX_TEXT_LENGTH = 240;
export const MAX_SLACK_MENTIONS = 20;

export interface SlackMentionFormatResult {
  content: string;
  truncatedCount: number;
}

// 사용자에게 멘션된 최근 Slack 메시지를 PM 모델에게 "blocker 후보" 로 보여주는 섹션.
// "이 멘션이 정말 blocker 인지" 판단은 모델에게 위임 (사용자 입력 / 어제 plan / GitHub task 와 함께 종합 판단).
// mention 수가 maxItems 초과 시 최신 순 기준 앞에서 cap, 메시지 길이는 MAX_TEXT_LENGTH 자/건 cap.
export const formatSlackMentionsAsPromptSection = ({
  mentions,
  sinceHours,
  maxItems = MAX_SLACK_MENTIONS,
}: {
  mentions: SlackMention[];
  sinceHours: number;
  maxItems?: number;
}): SlackMentionFormatResult => {
  const lines: string[] = [
    `[Slack 에서 본인 멘션된 최근 메시지 (${sinceHours}h, blocker 후보)]`,
  ];

  if (mentions.length === 0) {
    lines.push('(없음)');
    return { content: lines.join('\n'), truncatedCount: 0 };
  }

  // ts desc 정렬 후 slice — collector 가 채널 traversal 순서로 누적해 정렬 X 상태로 들어옴.
  // sort 없이 slice 하면 noisy 채널이 quota 채워서 다른 채널의 최신 blocker 가 잘림 (codex review bmcs7wvk2 지적).
  const sorted = [...mentions].sort((a, b) => compareTsDesc(a.ts, b.ts));
  const visible = sorted.slice(0, maxItems);
  const truncatedCount = Math.max(0, sorted.length - maxItems);

  for (const mention of visible) {
    const channel = formatChannelLabel(mention);
    const author = mention.authorUserId ? `<@${mention.authorUserId}>` : '?';
    const snippet = truncate(mention.text, MAX_TEXT_LENGTH);
    lines.push(`- [${channel}] ${author}: ${snippet}`);
  }

  if (truncatedCount > 0) {
    lines.push(
      `(+${truncatedCount}건 생략 — 총 ${mentions.length}건 중 ${maxItems}건만 표기)`,
    );
  }

  return { content: lines.join('\n'), truncatedCount };
};

const formatChannelLabel = (mention: SlackMention): string =>
  match(mention)
    .with({ channelType: 'im' }, () => 'DM')
    .with({ channelType: 'mpim' }, () => 'group DM')
    .with(
      { channelType: 'private_channel', channelName: P.string },
      ({ channelName }) => `🔒${channelName}`,
    )
    .with({ channelName: P.string }, ({ channelName }) => `#${channelName}`)
    .otherwise(({ channelId }) => channelId);

// Slack ts 는 "1700000000.123456" 형태의 string. 큰 값이 최신.
// number 변환 시 부동소수점 정밀도 손실 가능하지만 desc 정렬 신호로는 충분.
const compareTsDesc = (a: string, b: string): number => {
  const numA = Number.parseFloat(a);
  const numB = Number.parseFloat(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    return b.localeCompare(a);
  }
  return numB - numA;
};

const truncate = (text: string, max: number): string => {
  // 줄바꿈을 한 칸 공백으로 정리 (prompt 섹션이 줄로 분할되니까).
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) {
    return flat;
  }
  return `${flat.slice(0, max)}…`;
};
