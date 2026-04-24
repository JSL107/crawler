import { DomainException } from '../../../common/exception/domain.exception';
import { DomainStatus } from '../../../common/exception/domain-status.enum';
import { ImpactReporterErrorCode } from './impact-reporter-error-code.enum';

type ImpactReporterExceptionOptions = {
  message: string;
  code: ImpactReporterErrorCode;
  status?: DomainStatus;
  cause?: unknown;
};

export class ImpactReporterException extends DomainException {
  readonly impactReporterErrorCode: ImpactReporterErrorCode;
  readonly cause: unknown;
  readonly status: DomainStatus;

  get errorCode(): string {
    return this.impactReporterErrorCode;
  }

  constructor({
    message,
    code,
    status = DomainStatus.INTERNAL,
    cause,
  }: ImpactReporterExceptionOptions) {
    super(message);
    this.name = new.target.name;
    this.impactReporterErrorCode = code;
    this.status = status;
    this.cause = cause;
  }
}
