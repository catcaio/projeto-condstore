import type { AttributionGroupBy } from '../../infra/attribution/attribution.types';

export interface AttributionBucketRow {
  bucket: string | null;
  count: number | string | null;
}

export interface AttributionBreakdown {
  groupBy: AttributionGroupBy;
  buckets: Array<{ key: string; count: number }>;
}

export type ParsedAttributionGroupBy = AttributionGroupBy | null | 'invalid';

export function parseAttributionGroupBy(value: string | null | undefined): ParsedAttributionGroupBy {
  if (!value || value === 'none') return null;
  if (value === 'utm_source' || value === 'utm_campaign') return value;
  return 'invalid';
}

export function isAttributionGroupBy(value: unknown): value is AttributionGroupBy {
  return value === 'utm_source' || value === 'utm_campaign';
}

export function buildAttributionBreakdown(
  groupBy: AttributionGroupBy,
  rows: AttributionBucketRow[],
): AttributionBreakdown {
  const normalized = new Map<string, number>();

  for (const row of rows) {
    const raw = typeof row.bucket === 'string' ? row.bucket.trim() : '';
    const key = raw ? raw : '(none)';
    const count = Number(row.count ?? 0);
    normalized.set(key, (normalized.get(key) ?? 0) + count);
  }

  const allBuckets = Array.from(normalized.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));

  const noneBucket = allBuckets.find((b) => b.key === '(none)');
  const topWithoutNone = allBuckets.filter((b) => b.key !== '(none)').slice(0, noneBucket ? 9 : 10);
  const buckets = noneBucket ? [...topWithoutNone, noneBucket] : topWithoutNone;

  return { groupBy, buckets };
}

export function unwrapRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }
  if (Array.isArray(result)) {
    return result as T[];
  }
  return [];
}
