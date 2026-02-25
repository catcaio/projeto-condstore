import { sql } from 'drizzle-orm';
import { getDataRetentionPolicy } from '../../infra/config/data-retention';
import { getDb } from '../../infra/db';
import { structuredLogger } from '../../infra/log/logger';

export interface CleanupTableResult {
  table: string;
  deletedCount: number;
  durationMs: number;
}

export interface CleanupRetentionResult {
  tables: CleanupTableResult[];
  totalDeleted: number;
  durationMs: number;
}

const BATCH_SIZE = 5000;
const BATCH_DELAY_MS = parseInt(process.env.RETENTION_CLEANUP_BATCH_DELAY_MS ?? '100', 10);

function cutoffDate(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function sleepBetweenBatches(deleted: number): Promise<void> {
  if (deleted > 0 && BATCH_DELAY_MS > 0) {
    return new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }
  return Promise.resolve();
}

function extractAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const first = result[0] as { affectedRows?: number; rowsAffected?: number } | undefined;
    if (typeof first?.affectedRows === 'number') return first.affectedRows;
    if (typeof first?.rowsAffected === 'number') return first.rowsAffected;
    return 0;
  }

  const obj = result as { affectedRows?: number; rowsAffected?: number } | undefined;
  if (typeof obj?.affectedRows === 'number') return obj.affectedRows;
  if (typeof obj?.rowsAffected === 'number') return obj.rowsAffected;
  return 0;
}

async function deleteBatch(table: string, cutoff: Date): Promise<number> {
  const db = await getDb();

  let result: unknown;
  switch (table) {
    case 'public_events':
      result = await db.execute(sql`DELETE FROM public_events WHERE created_at < ${cutoff} LIMIT ${BATCH_SIZE}`);
      break;
    case 'freight_funnel_events':
      result = await db.execute(sql`DELETE FROM freight_funnel_events WHERE created_at < ${cutoff} LIMIT ${BATCH_SIZE}`);
      break;
    case 'freight_simulation_logs':
      result = await db.execute(sql`DELETE FROM freight_simulation_logs WHERE created_at < ${cutoff} LIMIT ${BATCH_SIZE}`);
      break;
    case 'attribution_clicks':
      result = await db.execute(sql`DELETE FROM attribution_clicks WHERE created_at < ${cutoff} LIMIT ${BATCH_SIZE}`);
      break;
    case 'inbound_message_dedup':
      result = await db.execute(sql`DELETE FROM inbound_message_dedup WHERE created_at < ${cutoff} LIMIT ${BATCH_SIZE}`);
      break;
    default:
      throw new Error(`Unsupported cleanup table: ${table}`);
  }

  return extractAffectedRows(result);
}

async function cleanupTable(table: string, retentionDays: number, requestId?: string, now = new Date()): Promise<CleanupTableResult> {
  const startedAt = Date.now();
  const cutoff = cutoffDate(retentionDays, now);
  let deletedCount = 0;

  while (true) {
    const deleted = await deleteBatch(table, cutoff);
    deletedCount += deleted;
    if (deleted < BATCH_SIZE) {
      break;
    }
    // Add configurable delay between batches to reduce database load
    await sleepBetweenBatches(deleted);
  }

  const result = {
    table,
    deletedCount,
    durationMs: Date.now() - startedAt,
  };

  structuredLogger.info('retention_cleanup_table', {
    requestId,
    eventType: 'retention_cleanup',
    table,
    deletedCount,
    durationMs: result.durationMs,
    batchDelayMs: BATCH_DELAY_MS,
  });

  return result;
}

export async function runRetentionCleanup(input?: {
  requestId?: string;
  now?: Date;
}): Promise<CleanupRetentionResult> {
  const startedAt = Date.now();
  const now = input?.now ?? new Date();
  const policy = getDataRetentionPolicy();

  const tables: CleanupTableResult[] = [];
  tables.push(await cleanupTable('public_events', policy.publicEventsDays, input?.requestId, now));
  tables.push(await cleanupTable('freight_funnel_events', policy.funnelDays, input?.requestId, now));
  tables.push(await cleanupTable('freight_simulation_logs', policy.freightLogsDays, input?.requestId, now));
  tables.push(await cleanupTable('attribution_clicks', policy.attributionClicksDays, input?.requestId, now));
  tables.push(await cleanupTable('inbound_message_dedup', policy.dedupDays, input?.requestId, now));

  return {
    tables,
    totalDeleted: tables.reduce((sum, item) => sum + item.deletedCount, 0),
    durationMs: Date.now() - startedAt,
  };
}
