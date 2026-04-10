import { Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';

import {
  CrawlException,
  CrawlPermanentException,
  CrawlTransientException,
} from '../domain/crawl.exception';

const TRANSIENT_ERROR_PATTERN =
  /Navigation timeout|Timeout|net::ERR_|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i;

export const resolveCrawlError = ({
  error,
  url,
}: {
  error: unknown;
  url: string;
}): CrawlException => {
  if (error instanceof CrawlException) {
    return error;
  }

  if (!(error instanceof Error)) {
    return new CrawlPermanentException({
      message: `크롤링 중 알 수 없는 오류가 발생했습니다: ${url}`,
      cause: error,
    });
  }

  if (TRANSIENT_ERROR_PATTERN.test(error.message)) {
    return new CrawlTransientException({
      message: `일시적인 크롤링 오류가 발생했습니다: ${url}`,
      cause: error,
    });
  }

  return new CrawlPermanentException({
    message: `복구 불가능한 크롤링 오류가 발생했습니다: ${url}`,
    cause: error,
  });
};

export const createCleanupError = ({
  resource,
  url,
  cause,
}: {
  resource: 'page' | 'browser';
  url: string;
  cause: unknown;
}): CrawlException => {
  const label = resource === 'page' ? '페이지' : '브라우저';

  return new CrawlTransientException({
    message: `${label} 정리 중 오류가 발생했습니다: ${url}`,
    cause,
  });
};

export const createUnexpectedRequestError = ({
  url,
}: {
  url: string;
}): CrawlException => {
  return new CrawlTransientException({
    message: `크롤링 요청 처리 중 알 수 없는 오류가 발생했습니다: ${url}`,
  });
};

export const logCrawlError = ({
  logger,
  url,
  error,
}: {
  logger: Logger;
  url: string;
  error: CrawlException;
}): void => {
  if (error instanceof CrawlTransientException) {
    logger.warn(`${error.message} [${url}]`);
    return;
  }

  logger.error(`${error.message} [${url}]`, resolveStack({ error }));
};

export const toQueueError = ({ error }: { error?: CrawlException }): Error => {
  if (!error) {
    return new UnrecoverableError('크롤링 오류 정보가 없습니다.');
  }

  if (error instanceof CrawlPermanentException) {
    const queueError = new UnrecoverableError(error.message);
    queueError.stack = resolveStack({ error });
    return queueError;
  }

  return error;
};

const resolveStack = ({
  error,
}: {
  error: CrawlException;
}): string | undefined => {
  if (error.cause instanceof Error) {
    return error.cause.stack;
  }

  return error.stack;
};
