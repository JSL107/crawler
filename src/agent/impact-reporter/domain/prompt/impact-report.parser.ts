import { DomainStatus } from '../../../../common/exception/domain-status.enum';
import { ImpactReporterException } from '../impact-reporter.exception';
import { ImpactReport } from '../impact-reporter.type';
import { ImpactReporterErrorCode } from '../impact-reporter-error-code.enum';
import { isImpactReportShape } from './impact-report.shape';

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

export const parseImpactReport = (text: string): ImpactReport => {
  const cleaned = stripCodeFence(text.trim());
  const parsed = parseJson(cleaned);

  if (!isImpactReportShape(parsed)) {
    throw new ImpactReporterException({
      code: ImpactReporterErrorCode.INVALID_MODEL_OUTPUT,
      message: '모델 응답이 ImpactReport 스키마와 맞지 않습니다.',
      status: DomainStatus.BAD_GATEWAY,
    });
  }

  return parsed;
};

const stripCodeFence = (text: string): string => {
  const match = text.match(CODE_FENCE_PATTERN);
  return match ? match[1].trim() : text;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    throw new ImpactReporterException({
      code: ImpactReporterErrorCode.INVALID_MODEL_OUTPUT,
      message: '모델 응답을 JSON 으로 파싱하지 못했습니다.',
      status: DomainStatus.BAD_GATEWAY,
      cause: error,
    });
  }
};
