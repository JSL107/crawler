import { CrawlQueuePort } from '../domain/port/crawl-queue.port';
import { CrawlUsecase } from './crawl.usecase';

describe('CrawlUsecase', () => {
  let usecase: CrawlUsecase;
  let crawlQueuePort: jest.Mocked<CrawlQueuePort>;

  beforeEach(() => {
    crawlQueuePort = {
      enqueue: jest.fn(),
    };

    usecase = new CrawlUsecase(crawlQueuePort);
  });

  describe('requestCrawl', () => {
    it('주어진 url로 크롤링 작업을 큐에 등록한다', async () => {
      // Given
      const url = 'https://example.com';
      crawlQueuePort.enqueue.mockResolvedValue(undefined);

      // When
      await usecase.requestCrawl({ url });

      // Then
      expect(crawlQueuePort.enqueue).toHaveBeenCalledTimes(1);
      expect(crawlQueuePort.enqueue).toHaveBeenCalledWith({ url });
    });

    it('큐 등록 실패 시 예외를 전파한다', async () => {
      // Given
      const url = 'https://example.com';
      crawlQueuePort.enqueue.mockRejectedValue(
        new Error('Queue connection failed'),
      );

      // When / Then
      await expect(usecase.requestCrawl({ url })).rejects.toThrow(
        'Queue connection failed',
      );
    });
  });
});
