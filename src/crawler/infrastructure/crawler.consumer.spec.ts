import { UnrecoverableError } from 'bullmq';

import { ProcessCrawlJobUsecase } from '../application/process-crawl-job.usecase';
import {
  CrawlPermanentException,
  CrawlTransientException,
} from '../domain/crawl.exception';
import { CrawlerConsumer } from './crawler.consumer';

describe('CrawlerConsumer', () => {
  let consumer: CrawlerConsumer;
  let processCrawlJobUsecase: jest.Mocked<ProcessCrawlJobUsecase>;

  beforeEach(() => {
    processCrawlJobUsecase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ProcessCrawlJobUsecase>;

    consumer = new CrawlerConsumer(processCrawlJobUsecase);
    jest.spyOn(consumer['logger'], 'log').mockImplementation();
    jest.spyOn(consumer['logger'], 'warn').mockImplementation();
    jest.spyOn(consumer['logger'], 'error').mockImplementation();
  });

  it('성공한 작업 결과를 그대로 반환한다', async () => {
    processCrawlJobUsecase.execute.mockResolvedValue({
      url: 'https://example.com',
      status: 'SUCCESS',
      data: { title: 'Example', description: 'desc' },
    });

    await expect(
      consumer.process({ data: { url: 'https://example.com' } } as never),
    ).resolves.toEqual({
      url: 'https://example.com',
      status: 'SUCCESS',
      data: { title: 'Example', description: 'desc' },
    });
  });

  it('영구 실패는 재시도하지 않도록 UnrecoverableError로 변환한다', async () => {
    processCrawlJobUsecase.execute.mockRejectedValue(
      new CrawlPermanentException({
        message: '영구 실패',
      }),
    );

    await expect(
      consumer.process({ data: { url: 'https://example.com' } } as never),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('일시적 실패는 재시도 가능하도록 그대로 전파한다', async () => {
    processCrawlJobUsecase.execute.mockRejectedValue(
      new CrawlTransientException({
        message: '일시적 실패',
      }),
    );

    await expect(
      consumer.process({ data: { url: 'https://example.com' } } as never),
    ).rejects.toBeInstanceOf(CrawlTransientException);
  });
});
