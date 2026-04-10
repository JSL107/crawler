import { CrawlTarget } from '../crawler.type';

export const CRAWL_QUEUE_PORT = Symbol('CRAWL_QUEUE_PORT');

export interface CrawlQueuePort {
  enqueue({ url }: CrawlTarget): Promise<void>;
}
