import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { logger } from '../../../../../infra/logger';
import { redisClient } from '../../../../../infra/redis.client';
import { getFreightSimulationLogs, type FreightSimulationLogsResult } from '../../../../../modules/metrics/queries/freight-queries';
import { isAttributionGroupBy, parseAttributionGroupBy } from '../../../../../modules/metrics/attribution-breakdown';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';

type FreightMetricsResponse = FreightSimulationLogsResult;

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

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return finalize(auth.response, auth.code);

    const resolvedTenantId = auth.session.tenantId;
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

    // Query oficial (metrics = autoridade semântica); rota é apresentação.
    const payload: FreightMetricsResponse = await getFreightSimulationLogs(resolvedTenantId, requestedGroupBy);

    if (!groupBy) {
      writeToCache(cacheKey, resolvedTenantId, payload);
    }

    return finalize(NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': groupBy ? 'no-store, max-age=0' : 'private, max-age=60' },
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

