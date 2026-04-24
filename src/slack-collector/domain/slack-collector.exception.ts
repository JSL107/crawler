import { HttpStatus } from '@nestjs/common';

import { DomainException } from '../../common/exception/domain.exception';
import { SlackCollectorErrorCode } from './slack-collector-error-code.enum';

type SlackCollectorExceptionOptions = {
  message: string;
  code: SlackCollectorErrorCode;
  status?: HttpStatus;
  cause?: unknown;
};

export class SlackCollectorException extends DomainException {
  readonly slackCollectorErrorCode: SlackCollectorErrorCode;
  readonly cause: unknown;
  readonly httpStatus: number;

  get errorCode(): string {
    return this.slackCollectorErrorCode;
  }

  constructor({
    message,
    code,
    status = HttpStatus.BAD_GATEWAY,
    cause,
  }: SlackCollectorExceptionOptions) {
    super(message);
    this.name = new.target.name;
    this.slackCollectorErrorCode = code;
    this.httpStatus = status;
    this.cause = cause;
  }
}
