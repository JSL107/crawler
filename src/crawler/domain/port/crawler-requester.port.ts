import { CrawledPage, CrawlTarget } from '../crawler.type';

export const CRAWLER_REQUESTER_PORT = Symbol('CRAWLER_REQUESTER_PORT');

export interface CrawlerRequesterPort {
  request({ url }: CrawlTarget): Promise<CrawledPage>;
}
