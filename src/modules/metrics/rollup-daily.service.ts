import { sql } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { structuredLogger } from '../../infra/log/logger';
import { tenantRepository } from '../../infra/repositories/tenant.repository';
import { acquireLock, releaseLock } from '../../infra/security/distributed-lock';
import { getLocalDayBounds, normalizeTenantTimeZone } from '../../infra/time/window';
import { metricsDailyRepository, type MetricsDailyUpsertRow } from './metrics-daily.repository';
import { metricsRollupStatusRepository } from './metrics-rollup-status.repository';
import { unwrapRows } from './attribution-breakdown';

interface AggregateRow {
  tenantId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  count: number | string | null;
}

interface RollupCounterPatch {
  totalEvents?: number;
  funnelStarted?: number;
  freightSimulations?: number;
  consumedTokens?: number;
  clickTokens?: number;
}

interface TenantRollupResult {
  tenantId: string;
  timezone: string;
  rowsWritten: number;
  durationMs: number;
}

export interface RollupTenantErrorSummary {
  tenantId: string;
  day: string;
  code: string;
  message: string;
}

interface TenantRollupOutcome {
  tenantId: string;
  timezone: string;
  rowsWritten: number;
  durationMs: number;
  skipped: boolean;
  error: RollupTenantErrorSummary | null;
}

export interface RollupDailyResult {
  day: string;
  rowsWritten: number;
  skippedTenants: number;
  failedTenants: number;
  errors: RollupTenantErrorSummary[];
  lockBusy: boolean;
  durationMs: number;
}

export interface RollupBackfillResult {
  from: string;
  to: string;
  daysProcessed: number;
  rowsWritten: number;
  skippedDays: number;
  perDay: RollupDailyResult[];
  durationMs: number;
}

const TENANT_DAY_ROLLUP_LOCK_TTL_SEC = 10 * 60;
const DEFAULT_ROLLUP_CONCURRENCY = 4;
const MIN_ROLLUP_CONCURRENCY = 1;
const MAX_ROLLUP_CONCURRENCY = 16;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDim(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed || '(none)';
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayRangeUtc(day: string): { start: Date; end: Date } {
  if (!DAY_RE.test(day)) {
    throw new Error('day must be YYYY-MM-DD');
  }
  const start = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error('day must be YYYY-MM-DD');
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultRollupDay(now = new Date()): string {
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - 1);
  return formatIsoDay(utcMidnight);
}

export function parseRollupDayOrThrow(day: string | undefined | null, now = new Date()): string {
  if (!day || !day.trim()) {
    return defaultRollupDay(now);
  }
  const normalized = day.trim();
  dayRangeUtc(normalized);
  return normalized;
}

function eachDayInclusive(from: string, to: string): string[] {
  const { start } = dayRangeUtc(from);
  const { start: end } = dayRangeUtc(to);
  if (start.getTime() > end.getTime()) {
    throw new Error('from must be <= to');
  }

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(formatIsoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function inferRollupErrorCode(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (typeof e?.code === 'string' && e.code.trim()) {
    return e.code.trim().slice(0, 64);
  }

  if (typeof e?.message === 'string' && e.message.trim()) {
    return e.message.trim().slice(0, 64);
  }

  return 'ROLLUP_ERROR';
}

function inferRollupErrorMessage(error: unknown): string {
  const e = error as { message?: string };
  const message = typeof e?.message === 'string' ? e.message.trim() : '';
  if (!message) return 'Rollup failed';
  return message.slice(0, 240);
}

function getRollupConcurrencyLimit(): number {
  const raw = process.env.METRICS_ROLLUP_CONCURRENCY?.trim();
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) {
    return DEFAULT_ROLLUP_CONCURRENCY;
  }
  return Math.min(MAX_ROLLUP_CONCURRENCY, Math.max(MIN_ROLLUP_CONCURRENCY, Math.trunc(parsed)));
}

async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const normalizedLimit = Math.min(items.length, Math.max(1, Math.trunc(limit)));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: normalizedLimit }, () => runWorker()));
  return results;
}

async function queryAggregateRowsForTenant(
  tenantId: string,
  range: { startUTC: Date; endUTC: Date },
): Promise<{
  publicEvents: AggregateRow[];
  funnelStarted: AggregateRow[];
  freightSimulations: AggregateRow[];
  clickTokens: AggregateRow[];
  consumedTokens: AggregateRow[];
}> {
  const db = await getDb();
  const { startUTC, endUTC } = range;

  const [publicEventsR, funnelStartedR, freightSimulationsR, clickTokensR, consumedTokensR] = await Promise.all([
    db.execute(sql`
      SELECT
        tenant_id AS tenantId,
        COALESCE(NULLIF(utm_source, ''), '(none)') AS utmSource,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utmCampaign,
        COUNT(*) AS count
      FROM public_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startUTC}
        AND created_at < ${endUTC}
      GROUP BY tenant_id, COALESCE(NULLIF(utm_source, ''), '(none)'), COALESCE(NULLIF(utm_campaign, ''), '(none)')
    `),
    db.execute(sql`
      SELECT
        tenant_id AS tenantId,
        COALESCE(NULLIF(utm_source, ''), '(none)') AS utmSource,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utmCampaign,
        COUNT(*) AS count
      FROM freight_funnel_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startUTC}
        AND created_at < ${endUTC}
        AND stage = 'FLOW_STARTED'
      GROUP BY tenant_id, COALESCE(NULLIF(utm_source, ''), '(none)'), COALESCE(NULLIF(utm_campaign, ''), '(none)')
    `),
    db.execute(sql`
      SELECT
        tenant_id AS tenantId,
        COALESCE(NULLIF(utm_source, ''), '(none)') AS utmSource,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utmCampaign,
        COUNT(*) AS count
      FROM freight_simulation_logs
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startUTC}
        AND created_at < ${endUTC}
      GROUP BY tenant_id, COALESCE(NULLIF(utm_source, ''), '(none)'), COALESCE(NULLIF(utm_campaign, ''), '(none)')
    `),
    db.execute(sql`
      SELECT
        tenant_id AS tenantId,
        COALESCE(NULLIF(utm_source, ''), '(none)') AS utmSource,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utmCampaign,
        COUNT(*) AS count
      FROM attribution_clicks
      WHERE tenant_id IS NOT NULL
        AND tenant_id = ${tenantId}
        AND created_at >= ${startUTC}
        AND created_at < ${endUTC}
      GROUP BY tenant_id, COALESCE(NULLIF(utm_source, ''), '(none)'), COALESCE(NULLIF(utm_campaign, ''), '(none)')
    `),
    db.execute(sql`
      SELECT
        tenant_id AS tenantId,
        COALESCE(NULLIF(utm_source, ''), '(none)') AS utmSource,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS utmCampaign,
        COUNT(*) AS count
      FROM attribution_clicks
      WHERE tenant_id IS NOT NULL
        AND tenant_id = ${tenantId}
        AND consumed_at IS NOT NULL
        AND consumed_at >= ${startUTC}
        AND consumed_at < ${endUTC}
      GROUP BY tenant_id, COALESCE(NULLIF(utm_source, ''), '(none)'), COALESCE(NULLIF(utm_campaign, ''), '(none)')
    `),
  ]);

  return {
    publicEvents: unwrapRows<AggregateRow>(publicEventsR),
    funnelStarted: unwrapRows<AggregateRow>(funnelStartedR),
    freightSimulations: unwrapRows<AggregateRow>(freightSimulationsR),
    clickTokens: unwrapRows<AggregateRow>(clickTokensR),
    consumedTokens: unwrapRows<AggregateRow>(consumedTokensR),
  };
}

function applyPatch(
  store: Map<string, MetricsDailyUpsertRow>,
  day: string,
  rows: AggregateRow[],
  patchFactory: (count: number) => RollupCounterPatch,
): void {
  for (const row of rows) {
    const tenantId = row.tenantId?.trim() ?? '';
    if (!tenantId) continue;
    const utmSource = normalizeDim(row.utmSource);
    const utmCampaign = normalizeDim(row.utmCampaign);
    const key = `${tenantId}::${utmSource}::${utmCampaign}`;

    const existing = store.get(key) ?? {
      tenantId,
      dayDate: day,
      utmSource,
      utmCampaign,
      totalEvents: 0,
      funnelStarted: 0,
      freightSimulations: 0,
      consumedTokens: 0,
      clickTokens: 0,
    };

    const patch = patchFactory(toCount(row.count));
    existing.totalEvents = patch.totalEvents ?? existing.totalEvents;
    existing.funnelStarted = patch.funnelStarted ?? existing.funnelStarted;
    existing.freightSimulations = patch.freightSimulations ?? existing.freightSimulations;
    existing.consumedTokens = patch.consumedTokens ?? existing.consumedTokens;
    existing.clickTokens = patch.clickTokens ?? existing.clickTokens;
    store.set(key, existing);
  }
}

async function processTenantDailyMetricsRollup(input: {
  tenant: Awaited<ReturnType<typeof tenantRepository.getAllTenants>>[number];
  day: string;
  requestId?: string;
}): Promise<TenantRollupOutcome> {
  const tenantStartedAt = Date.now();
  const tenant = input.tenant;
  const day = input.day;
  const timezone = normalizeTenantTimeZone(tenant.timezone);
  const bounds = getLocalDayBounds(day, timezone);
  const merged = new Map<string, MetricsDailyUpsertRow>();
  const lockKey = `rollup:lock:${tenant.id}:${day}`;
  let lockAcquired = false;
  let lockToken = '';

  structuredLogger.info('metrics_rollup_daily_tenant_start', {
    requestId: input.requestId,
    eventType: 'metrics_rollup_daily_tenant',
    tenantId: tenant.id,
    timezone,
    day,
    startUTC: bounds.startUTC.toISOString(),
    endUTC: bounds.endUTC.toISOString(),
  });

  try {
    const lock = await acquireLock(lockKey, TENANT_DAY_ROLLUP_LOCK_TTL_SEC);
    lockAcquired = lock.acquired;
    lockToken = lock.token;

    if (!lock.acquired) {
      await metricsRollupStatusRepository.markLockBusy({
        tenantId: tenant.id,
        runAt: new Date(),
      });
      const durationMs = Date.now() - tenantStartedAt;
      structuredLogger.warn('rollup_lock_busy', {
        requestId: input.requestId,
        eventType: 'metrics_rollup_daily_lock',
        tenantId: tenant.id,
        timezone,
        day,
        lockKey,
        ttlSec: TENANT_DAY_ROLLUP_LOCK_TTL_SEC,
        durationMs,
        outcome: 'skipped',
      });

      return {
        tenantId: tenant.id,
        timezone,
        rowsWritten: 0,
        durationMs,
        skipped: true,
        error: null,
      };
    }

    const aggregates = await queryAggregateRowsForTenant(tenant.id, bounds);

    applyPatch(merged, day, aggregates.publicEvents, (count) => ({ totalEvents: count }));
    applyPatch(merged, day, aggregates.funnelStarted, (count) => ({ funnelStarted: count }));
    applyPatch(merged, day, aggregates.freightSimulations, (count) => ({ freightSimulations: count }));
    applyPatch(merged, day, aggregates.clickTokens, (count) => ({ clickTokens: count }));
    applyPatch(merged, day, aggregates.consumedTokens, (count) => ({ consumedTokens: count }));

    const tenantRowsToUpsert = Array.from(merged.values());
    await metricsDailyRepository.upsertDailyRows(tenantRowsToUpsert);

    const tenantResult: TenantRollupResult = {
      tenantId: tenant.id,
      timezone,
      rowsWritten: tenantRowsToUpsert.length,
      durationMs: Date.now() - tenantStartedAt,
    };

    await metricsRollupStatusRepository.upsertSuccess({
      tenantId: tenant.id,
      day,
      runAt: new Date(),
      durationMs: tenantResult.durationMs,
      rowsWritten: tenantResult.rowsWritten,
    });

    structuredLogger.info('metrics_rollup_daily_tenant_end', {
      requestId: input.requestId,
      eventType: 'metrics_rollup_daily_tenant',
      tenantId: tenantResult.tenantId,
      timezone: tenantResult.timezone,
      day,
      rowsWritten: tenantResult.rowsWritten,
      durationMs: tenantResult.durationMs,
      outcome: 'ok',
    });

    return {
      tenantId: tenantResult.tenantId,
      timezone: tenantResult.timezone,
      rowsWritten: tenantResult.rowsWritten,
      durationMs: tenantResult.durationMs,
      skipped: false,
      error: null,
    };
  } catch (error) {
    const errorCode = inferRollupErrorCode(error);
    const errorMessage = inferRollupErrorMessage(error);
    try {
      await metricsRollupStatusRepository.upsertError({
        tenantId: tenant.id,
        runAt: new Date(),
        errorCode,
      });
    } catch (statusError) {
      structuredLogger.error('metrics_rollup_daily_tenant_status_error', {
        requestId: input.requestId,
        tenantId: tenant.id,
        timezone,
        day,
        eventType: 'metrics_rollup_daily_tenant',
        errorCode: inferRollupErrorCode(statusError),
        error: statusError,
      });
    }

    const durationMs = Date.now() - tenantStartedAt;
    structuredLogger.error('metrics_rollup_daily_tenant_failed', {
      requestId: input.requestId,
      tenantId: tenant.id,
      timezone,
      day,
      eventType: 'metrics_rollup_daily_tenant',
      durationMs,
      errorCode,
      error,
    });

    return {
      tenantId: tenant.id,
      timezone,
      rowsWritten: 0,
      durationMs,
      skipped: false,
      error: {
        tenantId: tenant.id,
        day,
        code: errorCode,
        message: errorMessage,
      },
    };
  } finally {
    if (lockAcquired) {
      try {
        await releaseLock(lockKey, lockToken);
      } catch (releaseError) {
        structuredLogger.error('rollup_lock_release_failed', {
          requestId: input.requestId,
          eventType: 'metrics_rollup_daily_lock',
          tenantId: tenant.id,
          timezone,
          day,
          lockKey,
          errorCode: inferRollupErrorCode(releaseError),
          error: releaseError,
        });
      }
    }
  }
}

export async function runDailyMetricsRollup(input: {
  day?: string | null;
  tenantId?: string | null;
  requestId?: string;
  now?: Date;
}): Promise<RollupDailyResult> {
  const startedAt = Date.now();
  const day = parseRollupDayOrThrow(input.day, input.now);

  structuredLogger.info('metrics_rollup_daily_start', {
    requestId: input.requestId,
    eventType: 'metrics_rollup_daily',
    day,
    tenantId: input.tenantId ?? undefined,
    concurrency: getRollupConcurrencyLimit(),
  });

  const tenants = await (input.tenantId?.trim()
    ? (() => {
        const tenantId = input.tenantId!.trim();
        return tenantRepository.getTenantById(tenantId).then((tenant) => {
          if (!tenant) throw new Error('tenant_not_found');
          return [tenant];
        });
      })()
    : tenantRepository.getAllTenants());

  const concurrency = input.tenantId?.trim()
    ? 1
    : Math.min(tenants.length || 1, getRollupConcurrencyLimit());

  const tenantOutcomes = await mapWithConcurrencyLimit(
    tenants,
    concurrency,
    (tenant) => processTenantDailyMetricsRollup({
      tenant,
      day,
      requestId: input.requestId,
    }),
  );

  const errors = tenantOutcomes
    .map((outcome) => outcome.error)
    .filter((error): error is RollupTenantErrorSummary => Boolean(error));
  const totalRowsWritten = tenantOutcomes.reduce((sum, outcome) => sum + outcome.rowsWritten, 0);
  const skippedTenants = tenantOutcomes.reduce((sum, outcome) => sum + (outcome.skipped ? 1 : 0), 0);

  const result: RollupDailyResult = {
    day,
    rowsWritten: totalRowsWritten,
    skippedTenants,
    failedTenants: errors.length,
    errors,
    lockBusy: Boolean(input.tenantId?.trim()) && skippedTenants > 0 && totalRowsWritten === 0,
    durationMs: Date.now() - startedAt,
  };

  if (input.tenantId?.trim() && errors.length > 0) {
    const firstError = errors[0];
    structuredLogger.error('metrics_rollup_daily_end', {
      requestId: input.requestId,
      eventType: 'metrics_rollup_daily',
      day,
      tenantId: input.tenantId ?? undefined,
      rowsWritten: result.rowsWritten,
      skippedTenants: result.skippedTenants,
      failedTenants: result.failedTenants,
      lockBusy: result.lockBusy,
      durationMs: result.durationMs,
      errors,
      outcome: 'error',
    });
    const error = new Error(firstError.message);
    (error as Error & { code?: string }).code = firstError.code;
    throw error;
  }

  structuredLogger.info('metrics_rollup_daily_end', {
    requestId: input.requestId,
    eventType: 'metrics_rollup_daily',
    day,
    tenantId: input.tenantId ?? undefined,
    rowsWritten: result.rowsWritten,
    skippedTenants: result.skippedTenants,
    failedTenants: result.failedTenants,
    lockBusy: result.lockBusy,
    durationMs: result.durationMs,
    errors,
    outcome: errors.length > 0 ? 'partial_error' : 'ok',
  });

  return result;
}

export async function runRollupBackfill(input: {
  from: string;
  to: string;
  requestId?: string;
  now?: Date;
}): Promise<RollupBackfillResult> {
  const startedAt = Date.now();
  const from = parseRollupDayOrThrow(input.from, input.now);
  const to = parseRollupDayOrThrow(input.to, input.now);
  const days = eachDayInclusive(from, to);

  if (days.length > 31) {
    throw new Error('range_too_large');
  }

  const perDay: RollupDailyResult[] = [];
  let skippedDays = 0;
  for (const day of days) {
    const result = await runDailyMetricsRollup({ day, requestId: input.requestId, now: input.now });
    if (result.skippedTenants > 0) {
      skippedDays += 1;
    }
    perDay.push(result);
  }

  return {
    from,
    to,
    daysProcessed: perDay.length,
    rowsWritten: perDay.reduce((sum, item) => sum + item.rowsWritten, 0),
    skippedDays,
    perDay,
    durationMs: Date.now() - startedAt,
  };
}
