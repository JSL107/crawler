import {
  ImpactAffectedAreas,
  ImpactBeforeAfter,
  ImpactReport,
} from '../impact-reporter.type';

export const isImpactReportShape = (value: unknown): value is ImpactReport => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.subject === 'string' &&
    typeof record.headline === 'string' &&
    isStringArray(record.quantitative) &&
    typeof record.qualitative === 'string' &&
    isAffectedAreasShape(record.affectedAreas) &&
    isBeforeAfterShape(record.beforeAfter) &&
    isStringArray(record.risks) &&
    typeof record.reasoning === 'string'
  );
};

const isAffectedAreasShape = (value: unknown): value is ImpactAffectedAreas => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isStringArray(record.users) &&
    isStringArray(record.team) &&
    isStringArray(record.service)
  );
};

const isBeforeAfterShape = (
  value: unknown,
): value is ImpactBeforeAfter | null => {
  if (value === null) {
    return true;
  }
  if (typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.before === 'string' && typeof record.after === 'string';
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
