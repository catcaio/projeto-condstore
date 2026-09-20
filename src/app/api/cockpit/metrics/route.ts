/**
 * GET /api/cockpit/metrics
 *
 * Returns today's operational metrics for the authenticated tenant.
 * Requires authenticated session; tenantId is derived from the verified session cookie.
 *
 * Response shape (all fields always present, always integers):
 *   { mensagensHoje: number, cotacoesHoje: number, pedidosHoje: number, erros24h: number }
 *
 * Cache: Redis key `cockpit:metrics:{tenantId}` TTL 30s (when Redis is available).
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from "@/infra/redis.client";
import { logger } from '@/infra/logger';
import { requireAdmin } from '@/infra/auth/guards';
import { getOperationalMetrics, type OperationalMetrics as CockpitMetrics } from '../../../../modules/metrics/queries/operational-queries';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { isAttributionGroupBy, parseAttributionGroupBy } from '@/modules/metrics/attribution-breakdown';

const CACHE_TTL_SECONDS = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/cockpit/metrics';
  let tenantId: string | undefined;

  structuredLogger.info('cockpit_metrics_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('cockpit_metrics_end', {
      requestId,
      tenantId,
      route,
      eventType: 'route_end',
      durationMs: Date.now() - startedAt,
      status: response.status,
      outcome: response.status >= 400 ? 'error' : 'ok',
      errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
    });
    return response;
  };

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
  tenantId = auth.session.tenantId;

  const cacheKey = `cockpit:metrics:${tenantId}`;

  try {
    // Cache read (skip if Redis unavailable)
    if (!groupBy && redisClient.isAvailable()) {
      const cached = await redisClient.get<CockpitMetrics>(cacheKey);
      if (cached) {
        logger.debug('cockpit/metrics: cache hit', { tenantId });
        return finalize(NextResponse.json(cached, {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=30', 'X-Request-Id': requestId },
        }));
      }
    }

    // Query oficial (metrics = autoridade semântica); rota é apresentação.
    const payload: CockpitMetrics = await getOperationalMetrics(tenantId, groupBy);

    // Cache write (fire-and-forget)
    if (!groupBy && redisClient.isAvailable()) {
      redisClient.set<CockpitMetrics>(cacheKey, payload, CACHE_TTL_SECONDS).catch((err: unknown) => {
        logger.warn('cockpit/metrics: cache write failed', { tenantId }, err as Error);
      });
    }

    logger.info('cockpit/metrics: served', {
      tenantId,
      mensagensHoje: payload.mensagensHoje,
      cotacoesHoje: payload.cotacoesHoje,
    });

    return finalize(NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': groupBy ? 'no-store, max-age=0' : 'private, max-age=60', 'X-Request-Id': requestId },
    }));
  } catch (error) {
    structuredLogger.error('cockpit_metrics_failed', {
      requestId,
      tenantId,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.DB_ERROR,
      error,
    });
    return finalize(errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load metrics'), ErrorCode.DB_ERROR);
  }
}
