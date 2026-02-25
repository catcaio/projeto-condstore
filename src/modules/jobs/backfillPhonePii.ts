import { sql } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { structuredLogger } from '../../infra/log/logger';
import { decryptString, encryptString, isEncryptedString } from '../../infra/pii/crypto';
import { hashPhoneForTenant } from '../../infra/pii/phone';

const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_BATCHES = 20;
const REDACTED_PHONE_PLACEHOLDER = '[redacted]';
const REDACTED_BODY_PLACEHOLDER = '[redacted]';

interface BackfillPhonePiiOptions {
  requestId?: string;
  batchSize?: number;
  maxBatches?: number;
}

export interface BackfillPhonePiiResult {
  batchSize: number;
  maxBatches: number;
  batchesRun: number;
  messagesUpdated: number;
  funnelEventsUpdated: number;
  skippedRows: number;
  hasMore: boolean;
  durationMs: number;
}

interface MessageBackfillRow {
  message_sid: string;
  tenant_id: string;
  from_phone: string;
  phone_hash: string | null;
  phone_encrypted: string | null;
  body: string;
  body_encrypted: string | null;
}

interface FunnelBackfillRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  phone_hash: string | null;
  phone_encrypted: string | null;
}

function parsePositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return fallback;
  return Math.max(1, Math.trunc(value as number));
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) return first as T[];
  }
  return [];
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

function makeBodyPlaceholder(body: string): string {
  return `[encrypted:${body.length}]`;
}

function isAlreadyEncryptedPlaceholder(value: string): boolean {
  return typeof value === 'string' && /^\[encrypted:\d+\]$/.test(value);
}

async function selectMessageBatch(batchSize: number): Promise<MessageBackfillRow[]> {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT
      message_sid,
      tenant_id,
      from_phone,
      phone_hash,
      phone_encrypted,
      body,
      body_encrypted
    FROM messages
    WHERE (
      from_phone <> ${REDACTED_PHONE_PLACEHOLDER}
      OR (phone_hash IS NULL AND (from_phone <> ${REDACTED_PHONE_PLACEHOLDER} OR phone_encrypted IS NOT NULL))
      OR (phone_encrypted IS NULL AND from_phone <> ${REDACTED_PHONE_PLACEHOLDER})
      OR (body_encrypted IS NULL AND body <> ${REDACTED_BODY_PLACEHOLDER})
      OR (
        body <> ${REDACTED_BODY_PLACEHOLDER}
        AND body NOT REGEXP '^\\[encrypted:[0-9]+\\]$'
      )
    )
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `);
  return extractRows<MessageBackfillRow>(result);
}

async function selectFunnelBatch(batchSize: number): Promise<FunnelBackfillRow[]> {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT
      id,
      tenant_id,
      phone_number,
      phone_hash,
      phone_encrypted
    FROM freight_funnel_events
    WHERE (
      phone_number <> ${REDACTED_PHONE_PLACEHOLDER}
      OR (phone_hash IS NULL AND (phone_number <> ${REDACTED_PHONE_PLACEHOLDER} OR phone_encrypted IS NOT NULL))
      OR (phone_encrypted IS NULL AND phone_number <> ${REDACTED_PHONE_PLACEHOLDER})
    )
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `);
  return extractRows<FunnelBackfillRow>(result);
}

async function updateMessageRow(row: MessageBackfillRow): Promise<{ updated: boolean; skipped: boolean }> {
  const tenantId = row.tenant_id?.trim();
  const legacyPhone = row.from_phone?.trim();
  const legacyBody = row.body ?? '';

  if (!tenantId) {
    return { updated: false, skipped: true };
  }

  let phoneSource = legacyPhone;
  if (!phoneSource || phoneSource === REDACTED_PHONE_PLACEHOLDER) {
    if (row.phone_encrypted && isEncryptedString(row.phone_encrypted)) {
      phoneSource = decryptString(row.phone_encrypted);
    }
  }
  if (!phoneSource) {
    return { updated: false, skipped: true };
  }

  const { e164, hash } = hashPhoneForTenant(phoneSource, tenantId);
  const phoneEncrypted = row.phone_encrypted && isEncryptedString(row.phone_encrypted)
    ? row.phone_encrypted
    : encryptString(e164);

  let bodyEncrypted = row.body_encrypted && isEncryptedString(row.body_encrypted)
    ? row.body_encrypted
    : null;

  if (!bodyEncrypted) {
    if (legacyBody && !isAlreadyEncryptedPlaceholder(legacyBody) && legacyBody !== REDACTED_BODY_PLACEHOLDER) {
      bodyEncrypted = encryptString(legacyBody);
    } else {
      return { updated: false, skipped: true };
    }
  }

  let bodyPlaceholder = REDACTED_BODY_PLACEHOLDER;
  if (isAlreadyEncryptedPlaceholder(legacyBody)) {
    bodyPlaceholder = legacyBody;
  } else if (legacyBody && legacyBody !== REDACTED_BODY_PLACEHOLDER) {
    bodyPlaceholder = makeBodyPlaceholder(legacyBody);
  } else if (bodyEncrypted) {
    bodyPlaceholder = makeBodyPlaceholder(decryptString(bodyEncrypted));
  }

  const db = await getDb();
  const result = await db.execute(sql`
    UPDATE messages
    SET
      phone_hash = ${hash},
      phone_encrypted = ${phoneEncrypted},
      from_phone = ${REDACTED_PHONE_PLACEHOLDER},
      body_encrypted = ${bodyEncrypted},
      body = ${bodyPlaceholder}
    WHERE message_sid = ${row.message_sid}
  `);

  return { updated: extractAffectedRows(result) > 0, skipped: false };
}

async function updateFunnelRow(row: FunnelBackfillRow): Promise<{ updated: boolean; skipped: boolean }> {
  const tenantId = row.tenant_id?.trim();
  const legacyPhone = row.phone_number?.trim();

  if (!tenantId) {
    return { updated: false, skipped: true };
  }

  let phoneSource = legacyPhone;
  if (!phoneSource || phoneSource === REDACTED_PHONE_PLACEHOLDER) {
    if (row.phone_encrypted && isEncryptedString(row.phone_encrypted)) {
      phoneSource = decryptString(row.phone_encrypted);
    }
  }
  if (!phoneSource) {
    return { updated: false, skipped: true };
  }

  const { e164, hash } = hashPhoneForTenant(phoneSource, tenantId);
  const phoneEncrypted = row.phone_encrypted && isEncryptedString(row.phone_encrypted)
    ? row.phone_encrypted
    : encryptString(e164);

  const db = await getDb();
  const result = await db.execute(sql`
    UPDATE freight_funnel_events
    SET
      phone_hash = ${hash},
      phone_encrypted = ${phoneEncrypted},
      phone_number = ${REDACTED_PHONE_PLACEHOLDER}
    WHERE id = ${row.id}
  `);

  return { updated: extractAffectedRows(result) > 0, skipped: false };
}

export async function backfillPhonePii(options?: BackfillPhonePiiOptions): Promise<BackfillPhonePiiResult> {
  const startedAt = Date.now();
  const batchSize = parsePositiveInt(options?.batchSize, DEFAULT_BATCH_SIZE);
  const maxBatches = parsePositiveInt(options?.maxBatches, DEFAULT_MAX_BATCHES);

  let messagesUpdated = 0;
  let funnelEventsUpdated = 0;
  let skippedRows = 0;
  let batchesRun = 0;
  let hasMore = false;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    batchesRun += 1;
    const messageRows = await selectMessageBatch(batchSize);
    const funnelRows = await selectFunnelBatch(batchSize);

    if (messageRows.length === 0 && funnelRows.length === 0) {
      hasMore = false;
      batchesRun -= 1;
      break;
    }

    for (const row of messageRows) {
      try {
        const outcome = await updateMessageRow(row);
        if (outcome.updated) messagesUpdated += 1;
        if (outcome.skipped) skippedRows += 1;
      } catch (error) {
        skippedRows += 1;
        structuredLogger.warn('backfill_phone_pii_message_row_failed', {
          requestId: options?.requestId,
          eventType: 'internal_job_row_error',
          rowId: row.message_sid,
          errorName: (error as Error).name,
        });
      }
    }

    for (const row of funnelRows) {
      try {
        const outcome = await updateFunnelRow(row);
        if (outcome.updated) funnelEventsUpdated += 1;
        if (outcome.skipped) skippedRows += 1;
      } catch (error) {
        skippedRows += 1;
        structuredLogger.warn('backfill_phone_pii_funnel_row_failed', {
          requestId: options?.requestId,
          eventType: 'internal_job_row_error',
          rowId: row.id,
          errorName: (error as Error).name,
        });
      }
    }

    hasMore = messageRows.length === batchSize || funnelRows.length === batchSize;
    if (!hasMore) break;
  }

  const result: BackfillPhonePiiResult = {
    batchSize,
    maxBatches,
    batchesRun,
    messagesUpdated,
    funnelEventsUpdated,
    skippedRows,
    hasMore,
    durationMs: Date.now() - startedAt,
  };

  structuredLogger.info('backfill_phone_pii_end', {
    requestId: options?.requestId,
    eventType: 'internal_job',
    batchesRun: result.batchesRun,
    messagesUpdated: result.messagesUpdated,
    funnelEventsUpdated: result.funnelEventsUpdated,
    skippedRows: result.skippedRows,
    hasMore: result.hasMore,
    durationMs: result.durationMs,
  });

  return result;
}
