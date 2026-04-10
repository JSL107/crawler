import { Inject, Injectable } from '@nestjs/common';

import { CrawlTarget } from '../domain/crawler.type';
import {
  CRAWL_QUEUE_PORT,
  CrawlQueuePort,
} from '../domain/port/crawl-queue.port';

@Injectable()
export class CrawlUsecase {
  constructor(
    @Inject(CRAWL_QUEUE_PORT) private readonly crawlQueuePort: CrawlQueuePort,
  ) {}

  async requestCrawl({ url }: CrawlTarget): Promise<void> {
    await this.crawlQueuePort.enqueue({ url });
  }
}
