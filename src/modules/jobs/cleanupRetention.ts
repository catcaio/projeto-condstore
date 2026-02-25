import type { DataRetentionPolicy } from '@/infra/config/data-retention';
import { runRetentionCleanup } from '@/modules/metrics/retention-cleanup.service';

export interface CleanupRetentionJobResult {
  retentionDays: number;
  deleted: {
    total: number;
    tables: Array<{
      table: string;
      count: number;
      durationMs: number;
    }>;
  };
  durationMs: number;
}

interface CleanupRetentionJobOptions {
  requestId?: string;
  now?: Date;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value?.trim() ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getBaseRetentionDays(): number {
  return parsePositiveInt(process.env.RETENTION_DAYS, 90);
}

function buildCronRetentionPolicy(retentionDays: number): DataRetentionPolicy {
  return {
    publicEventsDays: parsePositiveInt(process.env.RETENTION_PUBLIC_EVENTS_DAYS, retentionDays),
    funnelDays: parsePositiveInt(process.env.RETENTION_FUNNEL_DAYS, retentionDays),
    freightLogsDays: parsePositiveInt(process.env.RETENTION_FREIGHT_LOGS_DAYS, retentionDays),
    attributionClicksDays: parsePositiveInt(process.env.RETENTION_ATTR_CLICKS_DAYS, retentionDays),
    dedupDays: parsePositiveInt(process.env.RETENTION_DEDUP_DAYS, retentionDays),
  };
}

export async function cleanupRetention(options?: CleanupRetentionJobOptions): Promise<CleanupRetentionJobResult> {
  const retentionDays = getBaseRetentionDays();
  const result = await runRetentionCleanup({
    requestId: options?.requestId,
    now: options?.now,
    policy: buildCronRetentionPolicy(retentionDays),
  });

  return {
    retentionDays,
    deleted: {
      total: result.totalDeleted,
      tables: result.tables.map((table) => ({
        table: table.table,
        count: table.deletedCount,
        durationMs: table.durationMs,
      })),
    },
    durationMs: result.durationMs,
  };
}
