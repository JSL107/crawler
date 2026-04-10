export abstract class DomainException extends Error {
  abstract readonly errorCode: string;
  abstract readonly httpStatus: number;
}
