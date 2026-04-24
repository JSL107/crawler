import { NotionClientPort } from '../domain/port/notion-client.port';
import { ListActiveTasksUsecase } from './list-active-tasks.usecase';

describe('ListActiveTasksUsecase', () => {
  it('Notion client 호출 결과를 그대로 반환', async () => {
    const fixture = [
      {
        databaseId: 'DB1',
        pageId: 'p1',
        url: 'u',
        title: 't',
        properties: {},
      },
    ];
    const client: jest.Mocked<NotionClientPort> = {
      listActiveTasks: jest.fn().mockResolvedValue(fixture),
      findOrCreateDailyPage: jest.fn(),
      appendBlocks: jest.fn(),
    };
    const usecase = new ListActiveTasksUsecase(client);

    const result = await usecase.execute({ perDatabaseLimit: 10 });

    expect(result).toBe(fixture);
    expect(client.listActiveTasks).toHaveBeenCalledWith({
      perDatabaseLimit: 10,
    });
  });

  it('options 없이 호출도 OK', async () => {
    const client: jest.Mocked<NotionClientPort> = {
      listActiveTasks: jest.fn().mockResolvedValue([]),
      findOrCreateDailyPage: jest.fn(),
      appendBlocks: jest.fn(),
    };
    const usecase = new ListActiveTasksUsecase(client);

    await usecase.execute();

    expect(client.listActiveTasks).toHaveBeenCalledWith(undefined);
  });
});
