import { PoShadowReport } from '../po-shadow.type';

export const isPoShadowReportShape = (
  value: unknown,
): value is PoShadowReport => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.priorityRecheck === 'string' &&
    isStringArray(record.missingRequirements) &&
    isStringArray(record.releaseRisks) &&
    typeof record.realPurposeQuestion === 'string' &&
    typeof record.recommendation === 'string'
  );
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
