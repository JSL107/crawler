import { ParsedPage } from '../crawler.type';

export const CRAWLER_PARSER_PORT = Symbol('CRAWLER_PARSER_PORT');

export interface CrawlerParserPort {
  parse(html: string, url: string): ParsedPage;
}
