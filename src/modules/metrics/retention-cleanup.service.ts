import { sql } from 'drizzle-orm';
import { getDataRetentionPolicy, type DataRetentionPolicy } from '../../infra/config/data-retention';
import { getDb } from '../../infra/db';
import { structuredLogger } from '../../infra/log/logger';

export interface CleanupTableResult {
  table: string;
  deletedCount: number;
  durationMs: number;
  operation?: 'delete' | 'anonymize';
}

export interface CleanupRetentionResult {
  tables: CleanupTableResult[];
  totalDeleted: number;
  durationMs: number;
}

const BATCH_SIZE = 5000;
const REDACTED_PHONE_PLACEHOLDER = '[redacted]';
const REDACTED_BODY_PLACEHOLDER = '[redacted]';

function cutoffDate(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
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

async function anonymizeBatch(table: 'messages_pii' | 'freight_funnel_events_pii', cutoff: Date, newerThanCutoff?: Date): Promise<number> {
  const db = await getDb();

  let result: unknown;
  switch (table) {
    case 'messages_pii': {
      if (newerThanCutoff) {
        result = await db.execute(sql`
          UPDATE messages
          SET
            from_phone = ${REDACTED_PHONE_PLACEHOLDER},
            phone_encrypted = NULL,
            body = ${REDACTED_BODY_PLACEHOLDER},
            body_encrypted = NULL
          WHERE created_at < ${cutoff}
            AND created_at >= ${newerThanCutoff}
            AND (
              from_phone <> ${REDACTED_PHONE_PLACEHOLDER}
              OR phone_encrypted IS NOT NULL
              OR body <> ${REDACTED_BODY_PLACEHOLDER}
              OR body_encrypted IS NOT NULL
            )
          LIMIT ${BATCH_SIZE}
        `);
      } else {
        result = await db.execute(sql`
          UPDATE messages
          SET
            from_phone = ${REDACTED_PHONE_PLACEHOLDER},
            phone_encrypted = NULL,
            body = ${REDACTED_BODY_PLACEHOLDER},
            body_encrypted = NULL
          WHERE created_at < ${cutoff}
            AND (
              from_phone <> ${REDACTED_PHONE_PLACEHOLDER}
              OR phone_encrypted IS NOT NULL
              OR body <> ${REDACTED_BODY_PLACEHOLDER}
              OR body_encrypted IS NOT NULL
            )
          LIMIT ${BATCH_SIZE}
        `);
      }
      break;
    }
    case 'freight_funnel_events_pii': {
      if (newerThanCutoff) {
        result = await db.execute(sql`
          UPDATE freight_funnel_events
          SET
            phone_number = ${REDACTED_PHONE_PLACEHOLDER},
            phone_encrypted = NULL
          WHERE created_at < ${cutoff}
            AND created_at >= ${newerThanCutoff}
            AND (
              phone_number <> ${REDACTED_PHONE_PLACEHOLDER}
              OR phone_encrypted IS NOT NULL
            )
          LIMIT ${BATCH_SIZE}
        `);
      } else {
        result = await db.execute(sql`
          UPDATE freight_funnel_events
          SET
            phone_number = ${REDACTED_PHONE_PLACEHOLDER},
            phone_encrypted = NULL
          WHERE created_at < ${cutoff}
            AND (
              phone_number <> ${REDACTED_PHONE_PLACEHOLDER}
              OR phone_encrypted IS NOT NULL
            )
          LIMIT ${BATCH_SIZE}
        `);
      }
      break;
    }
    default:
      throw new Error(`Unsupported anonymize table: ${table}`);
  }

  return extractAffectedRows(result);
}

async function cleanupTable(
  table: string,
  retentionDays: number,
  requestId?: string,
  now = new Date(),
  operation: 'delete' | 'anonymize' = 'delete',
  newerThanRetentionDays?: number,
): Promise<CleanupTableResult> {
  const startedAt = Date.now();
  const cutoff = cutoffDate(retentionDays, now);
  const newerThanCutoff = typeof newerThanRetentionDays === 'number' ? cutoffDate(newerThanRetentionDays, now) : undefined;
  let deletedCount = 0;

  while (true) {
    const deleted = operation === 'delete'
      ? await deleteBatch(table, cutoff)
      : await anonymizeBatch(table as 'messages_pii' | 'freight_funnel_events_pii', cutoff, newerThanCutoff);
    deletedCount += deleted;
    if (deleted < BATCH_SIZE) {
      break;
    }
  }

  const result = {
    table,
    deletedCount,
    durationMs: Date.now() - startedAt,
    operation,
  };

  structuredLogger.info('retention_cleanup_table', {
    requestId,
    eventType: 'retention_cleanup',
    table,
    deletedCount,
    durationMs: result.durationMs,
    operation,
  });

  return result;
}

export async function runRetentionCleanup(input?: {
  requestId?: string;
  now?: Date;
  policy?: DataRetentionPolicy;
}): Promise<CleanupRetentionResult> {
  const startedAt = Date.now();
  const now = input?.now ?? new Date();
  const policy = input?.policy ?? getDataRetentionPolicy();

  const tables: CleanupTableResult[] = [];
  tables.push(await cleanupTable('messages_pii', policy.messagePiiDays, input?.requestId, now, 'anonymize'));
  if (policy.funnelPiiDays < policy.funnelDays) {
    tables.push(
      await cleanupTable(
        'freight_funnel_events_pii',
        policy.funnelPiiDays,
        input?.requestId,
        now,
        'anonymize',
        policy.funnelDays,
      ),
    );
  }
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
