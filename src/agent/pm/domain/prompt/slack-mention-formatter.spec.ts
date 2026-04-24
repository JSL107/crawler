import { SlackMention } from '../../../../slack-collector/domain/slack-collector.type';
import { formatSlackMentionsAsPromptSection } from './slack-mention-formatter';

describe('formatSlackMentionsAsPromptSection', () => {
  const base: SlackMention = {
    channelId: 'C1',
    channelName: 'general',
    channelType: 'public_channel',
    authorUserId: 'U999',
    ts: '1700000000.001',
    text: '<@U123> 도와주세요',
    permalink: undefined,
  };

  it('mentions 가 비어있으면 (없음) 표시 + 헤더 출력', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [],
      sinceHours: 24,
    });
    expect(text).toContain('Slack 에서 본인 멘션된 최근 메시지 (24h');
    expect(text).toContain('(없음)');
  });

  it('public 채널은 # 접두사', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [base],
      sinceHours: 24,
    });
    expect(text).toContain('[#general]');
    expect(text).toContain('<@U999>');
    expect(text).toContain('<@U123> 도와주세요');
  });

  it('private 채널은 🔒 접두사', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [
        { ...base, channelType: 'private_channel', channelName: 'secret' },
      ],
      sinceHours: 24,
    });
    expect(text).toContain('[🔒secret]');
  });

  it('DM 은 channel name 대신 "DM"', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [{ ...base, channelType: 'im', channelName: undefined }],
      sinceHours: 24,
    });
    expect(text).toContain('[DM]');
  });

  it('group DM 은 "group DM"', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [{ ...base, channelType: 'mpim', channelName: undefined }],
      sinceHours: 24,
    });
    expect(text).toContain('[group DM]');
  });

  it('긴 메시지는 240자에서 잘리고 ellipsis', () => {
    const longText = 'a'.repeat(500);
    const text = formatSlackMentionsAsPromptSection({
      mentions: [{ ...base, text: longText }],
      sinceHours: 24,
    });
    expect(text).toContain('a'.repeat(240) + '…');
    expect(text).not.toContain('a'.repeat(241));
  });

  it('줄바꿈 포함 메시지는 한 줄로 평탄화', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [{ ...base, text: 'line1\n\nline2\tline3' }],
      sinceHours: 24,
    });
    expect(text).toContain('line1 line2 line3');
  });

  it('authorUserId 가 없으면 "?" 로 표기', () => {
    const text = formatSlackMentionsAsPromptSection({
      mentions: [{ ...base, authorUserId: undefined }],
      sinceHours: 24,
    });
    expect(text).toContain('[#general] ?:');
  });
});
