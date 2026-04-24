import { HttpStatus } from '@nestjs/common';

import { DomainException } from '../../common/exception/domain.exception';
import { NotionErrorCode } from './notion-error-code.enum';

type NotionExceptionOptions = {
  message: string;
  code: NotionErrorCode;
  status?: HttpStatus;
  cause?: unknown;
};

export class NotionException extends DomainException {
  readonly notionErrorCode: NotionErrorCode;
  readonly cause: unknown;
  readonly httpStatus: number;

  get errorCode(): string {
    return this.notionErrorCode;
  }

  constructor({
    message,
    code,
    status = HttpStatus.BAD_GATEWAY,
    cause,
  }: NotionExceptionOptions) {
    super(message);
    this.name = new.target.name;
    this.notionErrorCode = code;
    this.httpStatus = status;
    this.cause = cause;
  }
}
