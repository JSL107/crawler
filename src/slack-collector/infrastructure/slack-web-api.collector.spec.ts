import { WebClient } from '@slack/web-api';

import { SlackCollectorException } from '../domain/slack-collector.exception';
import { SlackCollectorErrorCode } from '../domain/slack-collector-error-code.enum';
import { SlackWebApiCollector } from './slack-web-api.collector';

describe('SlackWebApiCollector', () => {
  const buildClient = ({
    conversations,
    historyByChannel,
  }: {
    conversations: Array<Record<string, unknown>>;
    historyByChannel: Record<string, Array<Record<string, unknown>>>;
  }): WebClient =>
    ({
      users: {
        conversations: jest.fn().mockResolvedValue({ channels: conversations }),
      },
      conversations: {
        history: jest
          .fn()
          .mockImplementation(({ channel }) =>
            Promise.resolve({ messages: historyByChannel[channel] ?? [] }),
          ),
      },
    }) as unknown as WebClient;

  it('client 가 null 이면 TOKEN_NOT_CONFIGURED 예외', async () => {
    const collector = new SlackWebApiCollector(null);

    await expect(
      collector.listMyMentions({ slackUserId: 'U123' }),
    ).rejects.toMatchObject({
      slackCollectorErrorCode: SlackCollectorErrorCode.TOKEN_NOT_CONFIGURED,
    });
  });

  it('각 채널 history 에서 <@USER_ID> 포함 메시지만 모아 반환', async () => {
    const client = buildClient({
      conversations: [
        { id: 'C1', name: 'general', is_private: false },
        { id: 'D1', is_im: true },
      ],
      historyByChannel: {
        C1: [
          {
            text: '안녕 <@U123> 이거 처리 부탁',
            user: 'U999',
            ts: '1700000000.001',
          },
          { text: '관련없는 메시지', user: 'U888', ts: '1700000001.000' },
        ],
        D1: [{ text: '<@U123> DM 임', user: 'U222', ts: '1700000002.000' }],
      },
    });
    const collector = new SlackWebApiCollector(client);

    const mentions = await collector.listMyMentions({ slackUserId: 'U123' });

    expect(mentions).toHaveLength(2);
    expect(mentions[0]).toMatchObject({
      channelId: 'C1',
      channelName: 'general',
      channelType: 'public_channel',
      authorUserId: 'U999',
      text: expect.stringContaining('<@U123>'),
    });
    expect(mentions[1]).toMatchObject({
      channelId: 'D1',
      channelType: 'im',
    });
  });

  it('한 채널의 history 가 throw 해도 다른 채널은 계속 수집', async () => {
    const conversations = jest.fn().mockResolvedValue({
      channels: [
        { id: 'C1', is_private: false },
        { id: 'C2', is_private: true, name: 'secret' },
      ],
    });
    const history = jest.fn().mockImplementation(({ channel }) => {
      if (channel === 'C1') {
        return Promise.reject(new Error('not_in_channel'));
      }
      return Promise.resolve({
        messages: [{ text: '<@U> here', user: 'U2', ts: '1.0' }],
      });
    });
    const client = {
      users: { conversations },
      conversations: { history },
    } as unknown as WebClient;
    const collector = new SlackWebApiCollector(client);

    const mentions = await collector.listMyMentions({ slackUserId: 'U' });

    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({
      channelId: 'C2',
      channelType: 'private_channel',
    });
  });

  it('users.conversations 호출 실패 시 REQUEST_FAILED 예외로 감싼다', async () => {
    const client = {
      users: {
        conversations: jest.fn().mockRejectedValue(new Error('rate limit')),
      },
      conversations: { history: jest.fn() },
    } as unknown as WebClient;
    const collector = new SlackWebApiCollector(client);

    await expect(
      collector.listMyMentions({ slackUserId: 'U' }),
    ).rejects.toBeInstanceOf(SlackCollectorException);
  });

  it('sinceHours 가 oldest 타임스탬프로 변환되어 history 호출에 전달', async () => {
    const conversations = jest
      .fn()
      .mockResolvedValue({ channels: [{ id: 'C1' }] });
    const history = jest.fn().mockResolvedValue({ messages: [] });
    const client = {
      users: { conversations },
      conversations: { history },
    } as unknown as WebClient;
    const collector = new SlackWebApiCollector(client);

    const before = Math.floor(Date.now() / 1000);
    await collector.listMyMentions({ slackUserId: 'U', sinceHours: 1 });
    const after = Math.floor(Date.now() / 1000);

    const oldestArg = Number(history.mock.calls[0][0].oldest);
    expect(oldestArg).toBeGreaterThanOrEqual(before - 3601);
    expect(oldestArg).toBeLessThanOrEqual(after - 3599);
  });
});
