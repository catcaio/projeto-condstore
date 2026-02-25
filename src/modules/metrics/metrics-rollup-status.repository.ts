import { eq } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { metricsRollupStatus, type MetricsRollupStatusRecord } from '../../drizzle/schema';

export interface RollupStatusSuccessInput {
  tenantId: string;
  day: string;
  runAt?: Date;
  durationMs: number;
  rowsWritten: number;
}

export interface RollupStatusErrorInput {
  tenantId: string;
  errorCode: string;
  runAt?: Date;
}

export interface RollupStatusLockBusyInput {
  tenantId: string;
  runAt?: Date;
}

function normalizeErrorCode(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'ROLLUP_ERROR';
  return trimmed.slice(0, 64);
}

export class MetricsRollupStatusRepository {
  async getByTenant(tenantId: string): Promise<MetricsRollupStatusRecord | null> {
    if (!tenantId?.trim()) return null;
    const db = await getDb();
    const rows = await db
      .select()
      .from(metricsRollupStatus)
      .where(eq(metricsRollupStatus.tenantId, tenantId.trim()))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertSuccess(input: RollupStatusSuccessInput): Promise<void> {
    const tenantId = input.tenantId.trim();
    if (!tenantId) throw new Error('tenantId is required');

    const db = await getDb();
    const runAt = input.runAt ?? new Date();
    await db
      .insert(metricsRollupStatus)
      .values({
        tenantId,
        lastDayProcessed: input.day,
        lastRunAt: runAt,
        lastDurationMs: Math.max(0, Math.trunc(input.durationMs)),
        lastRowsWritten: Math.max(0, Math.trunc(input.rowsWritten)),
        status: 'ok',
        lastErrorCode: null,
      })
      .onDuplicateKeyUpdate({
        set: {
          lastDayProcessed: input.day,
          lastRunAt: runAt,
          lastDurationMs: Math.max(0, Math.trunc(input.durationMs)),
          lastRowsWritten: Math.max(0, Math.trunc(input.rowsWritten)),
          status: 'ok',
          lastErrorCode: null,
        },
      });
  }

  async upsertError(input: RollupStatusErrorInput): Promise<void> {
    const tenantId = input.tenantId.trim();
    if (!tenantId) throw new Error('tenantId is required');

    const db = await getDb();
    const runAt = input.runAt ?? new Date();
    const errorCode = normalizeErrorCode(input.errorCode);

    await db
      .insert(metricsRollupStatus)
      .values({
        tenantId,
        lastRunAt: runAt,
        status: 'error',
        lastErrorCode: errorCode,
      })
      .onDuplicateKeyUpdate({
        set: {
          lastRunAt: runAt,
          status: 'error',
          lastErrorCode: errorCode,
        },
      });
  }

  async markLockBusy(input: RollupStatusLockBusyInput): Promise<void> {
    const tenantId = input.tenantId.trim();
    if (!tenantId) throw new Error('tenantId is required');

    const runAt = input.runAt ?? new Date();
    const current = await this.getByTenant(tenantId);
    const db = await getDb();

    if (!current) {
      await db
        .insert(metricsRollupStatus)
        .values({
          tenantId,
          lastRunAt: runAt,
          status: 'ok',
          lastErrorCode: null,
        })
        .onDuplicateKeyUpdate({
          set: {
            lastRunAt: runAt,
            status: 'ok',
            lastErrorCode: null,
          },
        });
      return;
    }

    if (current.status === 'error') {
      await db
        .update(metricsRollupStatus)
        .set({ lastRunAt: runAt })
        .where(eq(metricsRollupStatus.tenantId, tenantId));
      return;
    }

    await db
      .update(metricsRollupStatus)
      .set({
        lastRunAt: runAt,
        status: 'ok',
        lastErrorCode: null,
      })
      .where(eq(metricsRollupStatus.tenantId, tenantId));
  }
}

export const metricsRollupStatusRepository = new MetricsRollupStatusRepository();
