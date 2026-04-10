import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AllExceptionsFilter } from './../src/common/filter/all-exceptions.filter';
import { ResponseInterceptor } from './../src/common/interceptor/response.interceptor';
import { CrawlUsecase } from './../src/crawler/application/crawl.usecase';
import { CRAWL_QUEUE_PORT } from './../src/crawler/domain/port/crawl-queue.port';
import { CrawlerController } from './../src/crawler/interface/crawler.controller';

describe('CrawlerController (e2e)', () => {
  let app: INestApplication;
  let crawlQueuePort: { enqueue: jest.Mock };

  beforeEach(async () => {
    crawlQueuePort = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CrawlerController],
      providers: [
        CrawlUsecase,
        {
          provide: CRAWL_QUEUE_PORT,
          useValue: crawlQueuePort,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /v1/crawl-jobs — 유효하지 않은 URL은 400을 반환한다', () => {
    return request(app.getHttpAdapter().getInstance())
      .post('/v1/crawl-jobs')
      .send({ url: 'not-a-url' })
      .expect(400);
  });

  it('POST /v1/crawl-jobs — 유효한 요청은 큐 등록 후 성공 응답을 반환한다', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/v1/crawl-jobs')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(crawlQueuePort.enqueue).toHaveBeenCalledTimes(1);
    expect(crawlQueuePort.enqueue).toHaveBeenCalledWith({
      url: 'https://example.com',
    });
    expect(response.body).toEqual({
      code: 'SUCCESS',
      message: '요청이 성공적으로 처리되었습니다.',
      data: null,
    });
  });
});
