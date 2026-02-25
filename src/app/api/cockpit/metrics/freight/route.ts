import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../../../infra/db';
import { getSessionUser } from '../../../../../infra/auth/session';
import { logger } from '../../../../../infra/logger';
import { redisClient } from '../../../../../infra/redis.client';
import { buildAttributionBreakdown, isAttributionGroupBy, parseAttributionGroupBy, unwrapRows } from '../../../../../modules/metrics/attribution-breakdown';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';

interface FreightMetricsResponse {
  total_simulations_7d: number;
  top_ufs_7d: Array<{ uf: string; count: number }>;
  avg_valor_by_uf_7d: Array<{ uf: string; avg_valor: number }>;
  avg_peso_7d: number;
  avg_prazo_by_uf_7d: Array<{ uf: string; avg_prazo: number }>;
  daily_14d: Array<{ date: string; count: number }>;
  attribution_breakdown_7d?: {
    groupBy: 'utm_source' | 'utm_campaign';
    buckets: Array<{ key: string; count: number }>;
  };
}

interface FreightCacheEntry {
  expiresAt: number;
  payload: FreightMetricsResponse;
}

const CACHE_TTL_SECONDS = 60;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

const globalForFreightMetricsCache = globalThis as typeof globalThis & {
  cockpitFreightMetricsCache?: Map<string, FreightCacheEntry>;
};

const inMemoryCache =
  globalForFreightMetricsCache.cockpitFreightMetricsCache ??
  (globalForFreightMetricsCache.cockpitFreightMetricsCache = new Map<string, FreightCacheEntry>());

async function readFromCache(cacheKey: string, tenantId: string): Promise<FreightMetricsResponse | null> {
  try {
    if (redisClient.isAvailable()) {
      const cached = await redisClient.get<FreightMetricsResponse>(cacheKey);
      if (cached) {
        logger.info('cockpit/metrics/freight: cache_hit', { tenantId, cache: 'redis' });
        return cached;
      }
      logger.info('cockpit/metrics/freight: cache_miss', { tenantId, cache: 'redis' });
      return null;
    }
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache read failed', { tenantId, cache: 'redis' }, error as Error);
  }

  try {
    const cachedEntry = inMemoryCache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      logger.info('cockpit/metrics/freight: cache_hit', { tenantId, cache: 'memory' });
      return cachedEntry.payload;
    }

    if (cachedEntry) {
      inMemoryCache.delete(cacheKey);
    }

    logger.info('cockpit/metrics/freight: cache_miss', { tenantId, cache: 'memory' });
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache read failed', { tenantId, cache: 'memory' }, error as Error);
  }

  return null;
}

function writeToCache(cacheKey: string, tenantId: string, payload: FreightMetricsResponse): void {
  if (redisClient.isAvailable()) {
    redisClient.set<FreightMetricsResponse>(cacheKey, payload, CACHE_TTL_SECONDS).catch((error: unknown) => {
      logger.warn('cockpit/metrics/freight: cache write failed', { tenantId, cache: 'redis' }, error as Error);
    });
    return;
  }

  try {
    inMemoryCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  } catch (error) {
    logger.warn('cockpit/metrics/freight: cache write failed', { tenantId, cache: 'memory' }, error as Error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/cockpit/metrics/freight';
  let tenantId = 'unknown';

  structuredLogger.info('cockpit_metrics_freight_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('cockpit_metrics_freight_end', {
      requestId,
      tenantId: tenantId !== 'unknown' ? tenantId : undefined,
      route,
      eventType: 'route_end',
      durationMs: Date.now() - startedAt,
      status: response.status,
      outcome: response.status >= 400 ? 'error' : 'ok',
      errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
    });
    return response;
  };

  try {
    const requestedGroupBy = request.nextUrl?.searchParams.get('groupBy');
    const parsedGroupBy = parseAttributionGroupBy(requestedGroupBy);
    if (requestedGroupBy && !isAttributionGroupBy(parsedGroupBy) && requestedGroupBy !== 'none') {
      return finalize(
        errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid groupBy. Use utm_source, utm_campaign or none.'),
        ErrorCode.VALIDATION_ERROR,
      );
    }
    const groupBy = isAttributionGroupBy(parsedGroupBy) ? parsedGroupBy : null;

    const sessionUser = await getSessionUser(request);

    if (!sessionUser?.tenantId) {
      return finalize(errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized'), ErrorCode.AUTH_REQUIRED);
    }

    const resolvedTenantId = sessionUser.tenantId;
    tenantId = resolvedTenantId;
    const cacheKey = `cockpit:metrics:freight:${resolvedTenantId}`;

    if (!groupBy) {
      const cachedPayload = await readFromCache(cacheKey, resolvedTenantId);
      if (cachedPayload) {
        return finalize(NextResponse.json(cachedPayload, {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=60' },
        }));
      }
    }

    const db = await getDb();

    const [totalResult, topUfsResult, avgValorByUfResult, avgPesoResult, avgPrazoByUfResult, dailyResult, attributionBreakdownResult] =
      await Promise.all([
        db.execute(sql`
          SELECT COUNT(*) AS total
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
        `),
        db.execute(sql`
          SELECT uf, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY count DESC, uf ASC
        `),
        db.execute(sql`
          SELECT uf, AVG(valor) AS avg_valor
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY uf ASC
        `),
        db.execute(sql`
          SELECT AVG(peso) AS avg_peso
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
        `),
        db.execute(sql`
          SELECT uf, AVG(prazo) AS avg_prazo
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY uf
          ORDER BY uf ASC
        `),
        db.execute(sql`
          SELECT DATE(created_at) AS date, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${resolvedTenantId}
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `),
        groupBy
          ? db.execute(
              groupBy === 'utm_campaign'
                ? sql`
                    SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM freight_simulation_logs
                    WHERE tenant_id = ${resolvedTenantId}
                      AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
                    GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `
                : sql`
                    SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM freight_simulation_logs
                    WHERE tenant_id = ${resolvedTenantId}
                      AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
                    GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `,
            )
          : Promise.resolve(null),
      ]);

    const totalRows = unwrapRows<{ total: number | string }>(totalResult);
    const topUfsRows = unwrapRows<{ uf: string; count: number | string }>(topUfsResult);
    const avgValorRows = unwrapRows<{ uf: string; avg_valor: number | string | null }>(avgValorByUfResult);
    const avgPesoRows = unwrapRows<{ avg_peso: number | string | null }>(avgPesoResult);
    const avgPrazoRows = unwrapRows<{ uf: string; avg_prazo: number | string | null }>(avgPrazoByUfResult);
    const dailyRows = unwrapRows<{ date: string | Date; count: number | string }>(dailyResult);

    const payload: FreightMetricsResponse = {
      total_simulations_7d: Number(totalRows[0]?.total ?? 0),
      top_ufs_7d: topUfsRows.map((row) => ({ uf: row.uf, count: Number(row.count) })),
      avg_valor_by_uf_7d: avgValorRows.map((row) => ({ uf: row.uf, avg_valor: Number(row.avg_valor ?? 0) })),
      avg_peso_7d: Number(avgPesoRows[0]?.avg_peso ?? 0),
      avg_prazo_by_uf_7d: avgPrazoRows.map((row) => ({ uf: row.uf, avg_prazo: Number(row.avg_prazo ?? 0) })),
      daily_14d: dailyRows.map((row) => ({
        date: typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 10),
        count: Number(row.count),
      })),
    };

    if (groupBy && attributionBreakdownResult) {
      payload.attribution_breakdown_7d = buildAttributionBreakdown(
        groupBy,
        unwrapRows<{ bucket: string | null; count: number | string | null }>(attributionBreakdownResult),
      );
    }

    if (!groupBy) {
      writeToCache(cacheKey, resolvedTenantId, payload);
    }

    return finalize(NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=60' },
    }));
  } catch (error) {
    logger.error('cockpit/metrics/freight: unexpected error', error as Error, { tenantId });
    structuredLogger.error('cockpit_metrics_freight_failed', {
      requestId,
      tenantId: tenantId !== 'unknown' ? tenantId : undefined,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.DB_ERROR,
      error,
    });
    return finalize(errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Internal server error'), ErrorCode.DB_ERROR);
  }
}

