import { DomainStatus } from '../../../../common/exception/domain-status.enum';
import { PoShadowException } from '../po-shadow.exception';
import { PoShadowReport } from '../po-shadow.type';
import { PoShadowErrorCode } from '../po-shadow-error-code.enum';
import { isPoShadowReportShape } from './po-shadow.shape';

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

export const parsePoShadowReport = (text: string): PoShadowReport => {
  const cleaned = stripCodeFence(text.trim());
  const parsed = parseJson(cleaned);

  if (!isPoShadowReportShape(parsed)) {
    throw new PoShadowException({
      code: PoShadowErrorCode.INVALID_MODEL_OUTPUT,
      message: '모델 응답이 PoShadowReport 스키마와 맞지 않습니다.',
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
    throw new PoShadowException({
      code: PoShadowErrorCode.INVALID_MODEL_OUTPUT,
      message: '모델 응답을 JSON 으로 파싱하지 못했습니다.',
      status: DomainStatus.BAD_GATEWAY,
      cause: error,
    });
  }
};
