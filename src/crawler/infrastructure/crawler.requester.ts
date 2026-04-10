import { Injectable } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

import { CrawlException } from '../domain/crawl.exception';
import { CrawledPage, CrawlTarget } from '../domain/crawler.type';
import {
  CRAWLER_REQUESTER_PORT,
  CrawlerRequesterPort,
} from '../domain/port/crawler-requester.port';
import {
  createCleanupError,
  createUnexpectedRequestError,
} from './crawl-error.util';

export { CRAWLER_REQUESTER_PORT };

@Injectable()
export class CrawlerRequester implements CrawlerRequesterPort {
  async request({ url }: CrawlTarget): Promise<CrawledPage> {
    let browser: Browser | undefined;
    let page: Page | undefined;
    let requestError: unknown;
    let cleanupError: CrawlException | undefined;
    let result: CrawledPage | undefined;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      const html = await page.content();
      const finalUrl = page.url();
      const responseStatus = response ? response.status() : null;

      result = { requestedUrl: url, finalUrl, html, responseStatus };
    } catch (error: unknown) {
      requestError = error;
    } finally {
      cleanupError = await this.closeResources({ browser, page, url });
    }

    if (cleanupError && !requestError) {
      throw cleanupError;
    }

    if (requestError) {
      throw requestError;
    }

    if (result) {
      return result;
    }

    throw createUnexpectedRequestError({ url });
  }

  private async closeResources({
    browser,
    page,
    url,
  }: {
    browser?: Browser;
    page?: Page;
    url: string;
  }): Promise<CrawlException | undefined> {
    const pageCloseError = await this.closePage({ page, url });
    const browserCloseError = await this.closeBrowser({ browser, url });

    if (pageCloseError && browserCloseError) {
      return pageCloseError;
    }

    if (pageCloseError) {
      return pageCloseError;
    }

    return browserCloseError;
  }

  private async closePage({
    page,
    url,
  }: {
    page?: Page;
    url: string;
  }): Promise<CrawlException | undefined> {
    if (!page) {
      return undefined;
    }

    try {
      await page.close();
      return undefined;
    } catch (error: unknown) {
      return createCleanupError({ resource: 'page', url, cause: error });
    }
  }

  private async closeBrowser({
    browser,
    url,
  }: {
    browser?: Browser;
    url: string;
  }): Promise<CrawlException | undefined> {
    if (!browser) {
      return undefined;
    }

    try {
      await browser.close();
      return undefined;
    } catch (error: unknown) {
      return createCleanupError({ resource: 'browser', url, cause: error });
    }
  }
}
