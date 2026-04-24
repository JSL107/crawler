import { DomainException } from '../../../common/exception/domain.exception';
import { DomainStatus } from '../../../common/exception/domain-status.enum';
import { PoShadowErrorCode } from './po-shadow-error-code.enum';

type PoShadowExceptionOptions = {
  message: string;
  code: PoShadowErrorCode;
  status?: DomainStatus;
  cause?: unknown;
};

export class PoShadowException extends DomainException {
  readonly poShadowErrorCode: PoShadowErrorCode;
  readonly cause: unknown;
  readonly status: DomainStatus;

  get errorCode(): string {
    return this.poShadowErrorCode;
  }

  constructor({
    message,
    code,
    status = DomainStatus.INTERNAL,
    cause,
  }: PoShadowExceptionOptions) {
    super(message);
    this.name = new.target.name;
    this.poShadowErrorCode = code;
    this.status = status;
    this.cause = cause;
  }
}
