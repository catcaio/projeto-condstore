export interface DataRetentionPolicy {
  publicEventsDays: number;
  funnelDays: number;
  freightLogsDays: number;
  attributionClicksDays: number;
  dedupDays: number;
  messagePiiDays: number;
  funnelPiiDays: number;
}

function parseRetentionDays(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value?.trim() ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getDataRetentionPolicy(): DataRetentionPolicy {
  return {
    publicEventsDays: parseRetentionDays(process.env.RETENTION_PUBLIC_EVENTS_DAYS, 180),
    funnelDays: parseRetentionDays(process.env.RETENTION_FUNNEL_DAYS, 180),
    freightLogsDays: parseRetentionDays(process.env.RETENTION_FREIGHT_LOGS_DAYS, 180),
    attributionClicksDays: parseRetentionDays(process.env.RETENTION_ATTR_CLICKS_DAYS, 365),
    dedupDays: parseRetentionDays(process.env.RETENTION_DEDUP_DAYS, 30),
    messagePiiDays: parseRetentionDays(process.env.RETENTION_MESSAGE_PII_DAYS, 30),
    funnelPiiDays: parseRetentionDays(process.env.RETENTION_FUNNEL_PII_DAYS, 90),
  };
}
