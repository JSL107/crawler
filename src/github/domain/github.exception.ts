import { HttpStatus } from '@nestjs/common';

import { DomainException } from '../../common/exception/domain.exception';
import { GithubErrorCode } from './github-error-code.enum';

type GithubExceptionOptions = {
  message: string;
  code: GithubErrorCode;
  status?: HttpStatus;
  cause?: unknown;
};

export class GithubException extends DomainException {
  readonly githubErrorCode: GithubErrorCode;
  readonly cause: unknown;
  readonly httpStatus: number;

  get errorCode(): string {
    return this.githubErrorCode;
  }

  constructor({
    message,
    code,
    status = HttpStatus.BAD_GATEWAY,
    cause,
  }: GithubExceptionOptions) {
    super(message);
    this.name = new.target.name;
    this.githubErrorCode = code;
    this.httpStatus = status;
    this.cause = cause;
  }
}
