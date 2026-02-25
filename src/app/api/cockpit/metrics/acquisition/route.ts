import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../../../infra/db';
import { logger } from '../../../../../infra/logger';
import { redisClient } from '../../../../../infra/redis.client';
import { requireActivePlan } from '../../../../../modules/billing/requireActivePlan';
import { isAttributionGroupBy, parseAttributionGroupBy, unwrapRows } from '../../../../../modules/metrics/attribution-breakdown';
import { metricsDailyRepository } from '../../../../../modules/metrics/metrics-daily.repository';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';
import { tenantRepository } from '../../../../../infra/repositories/tenant.repository';
import {
  getLocalDateKey,
  getRangeBounds,
  normalizeTenantTimeZone,
  parseWindow as parseWindowDays,
  type MetricsWindowPreset,
} from '../../../../../infra/time/window';

export const runtime = 'nodejs';

type WindowPreset = MetricsWindowPreset;
type GroupBy = 'utm_source' | 'utm_campaign';
type AcquisitionDataSource = 'rollup' | 'raw';

interface CountRow {
  bucket: string | null;
  count: number | string | null;
}

interface AcquisitionBucket {
  key: string;
  total_click_tokens: number;
  total_consumed_tokens: number;
  total_events: number;
  funnel_started: number;
  freight_simulations: number;
  conversion_rate_1: number;
  conversion_rate_2: number;
}

interface AcquisitionTotals {
  total_click_tokens: number;
  total_consumed_tokens: number;
  total_events: number;
  funnel_started: number;
  freight_simulations: number;
  conversion_rate_1: number;
  conversion_rate_2: number;
}

interface AcquisitionMetricsResponse {
  window: WindowPreset;
  groupBy: GroupBy;
  source?: AcquisitionDataSource;
  totals: AcquisitionTotals;
  buckets: AcquisitionBucket[];
}

interface RollupBucketRow {
  bucket: string | null;
  total_click_tokens: number | string | null;
  total_consumed_tokens: number | string | null;
  total_events: number | string | null;
  funnel_started: number | string | null;
  freight_simulations: number | string | null;
}

const CACHE_TTL_SECONDS = 60;

function parseWindow(value: string | null | undefined): WindowPreset | 'invalid' {
  if (!value || value === '7d') return '7d';
  if (value === '30d') return '30d';
  return 'invalid';
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function normalizeCountMap(rows: CountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = typeof row.bucket === 'string' ? row.bucket.trim() : '';
    const key = raw || '(none)';
    map.set(key, (map.get(key) ?? 0) + Number(row.count ?? 0));
  }
  return map;
}

function mergeBuckets(input: {
  clicks: Map<string, number>;
  consumed: Map<string, number>;
  events: Map<string, number>;
  funnelStarted: Map<string, number>;
  freightSimulations: Map<string, number>;
}): AcquisitionBucket[] {
  const allKeys = new Set<string>([
    ...input.clicks.keys(),
    ...input.consumed.keys(),
    ...input.events.keys(),
    ...input.funnelStarted.keys(),
    ...input.freightSimulations.keys(),
  ]);

  const buckets = Array.from(allKeys).map((key) => {
    const total_click_tokens = input.clicks.get(key) ?? 0;
    const total_consumed_tokens = input.consumed.get(key) ?? 0;
    const total_events = input.events.get(key) ?? 0;
    const funnel_started = input.funnelStarted.get(key) ?? 0;
    const freight_simulations = input.freightSimulations.get(key) ?? 0;

    return {
      key,
      total_click_tokens,
      total_consumed_tokens,
      total_events,
      funnel_started,
      freight_simulations,
      conversion_rate_1: toRate(total_consumed_tokens, total_click_tokens),
      conversion_rate_2: toRate(freight_simulations, total_consumed_tokens),
    };
  });

  buckets.sort((a, b) => {
    return (
      b.total_click_tokens - a.total_click_tokens ||
      b.total_consumed_tokens - a.total_consumed_tokens ||
      b.freight_simulations - a.freight_simulations ||
      b.total_events - a.total_events ||
      a.key.localeCompare(b.key)
    );
  });

  return buckets;
}

function sumTotals(buckets: AcquisitionBucket[]): AcquisitionTotals {
  const totals = buckets.reduce<AcquisitionTotals>(
    (acc, bucket) => {
      acc.total_click_tokens += bucket.total_click_tokens;
      acc.total_consumed_tokens += bucket.total_consumed_tokens;
      acc.total_events += bucket.total_events;
      acc.funnel_started += bucket.funnel_started;
      acc.freight_simulations += bucket.freight_simulations;
      return acc;
    },
    {
      total_click_tokens: 0,
      total_consumed_tokens: 0,
      total_events: 0,
      funnel_started: 0,
      freight_simulations: 0,
      conversion_rate_1: 0,
      conversion_rate_2: 0,
    },
  );

  totals.conversion_rate_1 = toRate(totals.total_consumed_tokens, totals.total_click_tokens);
  totals.conversion_rate_2 = toRate(totals.freight_simulations, totals.total_consumed_tokens);
  return totals;
}

function cacheKey(
  tenantId: string,
  groupBy: GroupBy,
  window: WindowPreset,
  tz: string,
  source: AcquisitionDataSource,
): string {
  const tzKey = tz.replace(/[^A-Za-z0-9_-]/g, '_');
  return `cockpit:metrics:acquisition:${tenantId}:${groupBy}:${window}:tz=${tzKey}:source=${source}`;
}

function buildBucketsFromRollupRows(rows: RollupBucketRow[]): AcquisitionBucket[] {
  const buckets = rows.map((row) => {
    const key = (typeof row.bucket === 'string' && row.bucket.trim()) ? row.bucket.trim() : '(none)';
    const total_click_tokens = Number(row.total_click_tokens ?? 0);
    const total_consumed_tokens = Number(row.total_consumed_tokens ?? 0);
    const total_events = Number(row.total_events ?? 0);
    const funnel_started = Number(row.funnel_started ?? 0);
    const freight_simulations = Number(row.freight_simulations ?? 0);

    return {
      key,
      total_click_tokens,
      total_consumed_tokens,
      total_events,
      funnel_started,
      freight_simulations,
      conversion_rate_1: toRate(total_consumed_tokens, total_click_tokens),
      conversion_rate_2: toRate(freight_simulations, total_consumed_tokens),
    };
  });

  buckets.sort((a, b) => {
    return (
      b.total_click_tokens - a.total_click_tokens ||
      b.total_consumed_tokens - a.total_consumed_tokens ||
      b.freight_simulations - a.freight_simulations ||
      b.total_events - a.total_events ||
      a.key.localeCompare(b.key)
    );
  });

  return buckets;
}

function computeWindowRange(window: WindowPreset, tz: string): {
  rawStart: Date;
  rawEnd: Date;
  rollupStartDay: string;
  rollupEndDayExclusive: string;
} {
  const days = parseWindowDays(window);
  const { startUTC: rawStart, endUTC: rawEnd } = getRangeBounds(days, tz);

  return {
    rawStart,
    rawEnd,
    rollupStartDay: getLocalDateKey(rawStart, tz),
    rollupEndDayExclusive: getLocalDateKey(rawEnd, tz),
  };
}

async function queryGroupedCounts(
  tenantId: string,
  groupBy: GroupBy,
  windowStart: Date,
  windowEnd: Date,
): Promise<{
  clicks: CountRow[];
  consumed: CountRow[];
  events: CountRow[];
  funnelStarted: CountRow[];
  freightSimulations: CountRow[];
}> {
  const db = await getDb();
  const byCampaign = groupBy === 'utm_campaign';

  const [clicksR, consumedR, eventsR, funnelR, freightR] = await Promise.all(
    byCampaign
      ? [
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM attribution_clicks
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM attribution_clicks
            WHERE tenant_id = ${tenantId}
              AND consumed_at IS NOT NULL
              AND consumed_at >= ${windowStart}
              AND consumed_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM public_events
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM freight_funnel_events
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
              AND stage = 'FLOW_STARTED'
            GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM freight_simulation_logs
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
        ]
      : [
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM attribution_clicks
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM attribution_clicks
            WHERE tenant_id = ${tenantId}
              AND consumed_at IS NOT NULL
              AND consumed_at >= ${windowStart}
              AND consumed_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM public_events
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM freight_funnel_events
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
              AND stage = 'FLOW_STARTED'
            GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
          db.execute(sql`
            SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
            FROM freight_simulation_logs
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${windowStart}
              AND created_at < ${windowEnd}
            GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
            ORDER BY count DESC, bucket ASC
          `),
        ],
  );

  return {
    clicks: unwrapRows<CountRow>(clicksR),
    consumed: unwrapRows<CountRow>(consumedR),
    events: unwrapRows<CountRow>(eventsR),
    funnelStarted: unwrapRows<CountRow>(funnelR),
    freightSimulations: unwrapRows<CountRow>(freightR),
  };
}

async function queryRollupBuckets(
  tenantId: string,
  groupBy: GroupBy,
  range: { rollupStartDay: string; rollupEndDayExclusive: string },
): Promise<RollupBucketRow[]> {
  return metricsDailyRepository.queryAcquisitionBuckets({
    tenantId,
    groupBy,
    startDay: range.rollupStartDay,
    endDayExclusive: range.rollupEndDayExclusive,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/cockpit/metrics/acquisition';
  let tenantId: string | undefined;
  let timezone: string | undefined;

  structuredLogger.info('cockpit_metrics_acquisition_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('cockpit_metrics_acquisition_end', {
      requestId,
      tenantId,
      route,
      eventType: 'route_end',
      durationMs: Date.now() - startedAt,
      status: response.status,
      outcome: response.status >= 400 ? 'error' : 'ok',
      timezone,
      errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
    });
    if (timezone) {
      response.headers.set('X-Metrics-Timezone', timezone);
    }
    return response;
  };

  const entitlement = await requireActivePlan(request);
  if (entitlement.errorResponse) {
    return finalize(entitlement.errorResponse);
  }
  tenantId = entitlement.tenantId!;

  const parsedWindow = parseWindow(request.nextUrl.searchParams.get('window'));
  if (parsedWindow === 'invalid') {
    return finalize(
      errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid window. Use 7d or 30d.'),
      ErrorCode.VALIDATION_ERROR,
    );
  }

  const parsedGroupBy = parseAttributionGroupBy(request.nextUrl.searchParams.get('groupBy'));
  if (!isAttributionGroupBy(parsedGroupBy)) {
    return finalize(
      errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid groupBy. Use utm_source or utm_campaign.'),
      ErrorCode.VALIDATION_ERROR,
    );
  }

  const window = parsedWindow;
  const groupBy = parsedGroupBy;

  try {
    timezone = normalizeTenantTimeZone((await tenantRepository.getTenantById(tenantId))?.timezone);
    const range = computeWindowRange(window, timezone);
    const rollupCacheKey = cacheKey(tenantId, groupBy, window, timezone, 'rollup');
    const rawCacheKey = cacheKey(tenantId, groupBy, window, timezone, 'raw');
    if (redisClient.isAvailable()) {
      const cachedRollup = await redisClient.get<AcquisitionMetricsResponse>(rollupCacheKey);
      if (cachedRollup) {
        return finalize(NextResponse.json(cachedRollup, {
          status: 200,
          headers: {
            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
            'X-Cache': 'HIT',
            'X-Metrics-Source': 'rollup',
            'X-Metrics-Timezone': timezone,
          },
        }));
      }
    }

    let source: AcquisitionDataSource = 'rollup';
    let payload: AcquisitionMetricsResponse | null = null;

    try {
      const rollupRows = await queryRollupBuckets(tenantId, groupBy, range);
      if (rollupRows.length > 0) {
        const buckets = buildBucketsFromRollupRows(rollupRows);
        payload = {
          window,
          groupBy,
          source: 'rollup',
          totals: sumTotals(buckets),
          buckets,
        };
      }
    } catch (error) {
      if (!metricsDailyRepository.isUnavailableError(error)) {
        throw error;
      }

      structuredLogger.warn('cockpit_metrics_acquisition_rollup_unavailable_fallback_raw', {
        requestId,
        tenantId,
        route,
        eventType: 'rollup_fallback',
        errorCode: ErrorCode.DB_ERROR,
        source: 'rollup',
        timezone,
      });
    }

    if (!payload && redisClient.isAvailable()) {
      const cachedRaw = await redisClient.get<AcquisitionMetricsResponse>(rawCacheKey);
      if (cachedRaw) {
        return finalize(NextResponse.json(cachedRaw, {
          status: 200,
          headers: {
            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
            'X-Cache': 'HIT',
            'X-Metrics-Source': 'raw',
            'X-Metrics-Timezone': timezone,
          },
        }));
      }
    }

    if (!payload) {
      source = 'raw';
      const grouped = await queryGroupedCounts(tenantId, groupBy, range.rawStart, range.rawEnd);
      const buckets = mergeBuckets({
        clicks: normalizeCountMap(grouped.clicks),
        consumed: normalizeCountMap(grouped.consumed),
        events: normalizeCountMap(grouped.events),
        funnelStarted: normalizeCountMap(grouped.funnelStarted),
        freightSimulations: normalizeCountMap(grouped.freightSimulations),
      });

      payload = {
        window,
        groupBy,
        source,
        totals: sumTotals(buckets),
        buckets,
      };
    }

    if (redisClient.isAvailable()) {
      const finalKey = source === 'rollup' ? rollupCacheKey : rawCacheKey;
      redisClient.set(finalKey, payload, CACHE_TTL_SECONDS).catch(() => undefined);
    }

    return finalize(NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
        'X-Cache': 'MISS',
        'X-Metrics-Source': source,
        'X-Metrics-Timezone': timezone,
      },
    }));
  } catch (error) {
    logger.error('cockpit/metrics/acquisition: failed', error as Error, { tenantId, groupBy, window, timezone });
    structuredLogger.error('cockpit_metrics_acquisition_failed', {
      requestId,
      tenantId,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.DB_ERROR,
      timezone,
      error,
    });
    return finalize(
      errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load acquisition metrics'),
      ErrorCode.DB_ERROR,
    );
  }
}
