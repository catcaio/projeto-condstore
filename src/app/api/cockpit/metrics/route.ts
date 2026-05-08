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
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { redisClient } from "@/infra/redis.client";
import { logger } from '@/infra/logger';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { sql, eq, and, gte, or, like } from 'drizzle-orm';
import { orders, operationalEvents, simulations, conversationMessages } from '@/drizzle/schema';
import { buildAttributionBreakdown, isAttributionGroupBy, parseAttributionGroupBy, unwrapRows } from '@/modules/metrics/attribution-breakdown';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';

interface CockpitMetrics {
  mensagensHoje: number;
  cotacoesHoje: number;
  pedidosHoje: number;
  erros24h: number;
  tempoMedioRespostaMin: number | null;
  tempoMedioCotacaoMin: number | null;
  handoffsHoje: number;
  conversaoCotacaoPedido: number | null;
  attribution_breakdown_7d?: {
    groupBy: 'utm_source' | 'utm_campaign';
    buckets: Array<{ key: string; count: number }>;
  };
}

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

    // Real DB queries in parallel (tenant-isolated)
    const [
      msgMetrics,
      cotacoesHoje,
      attributionBreakdownResult,
      pedidosResult,
      errosResult,
      handoffsResult,
      timingsResult,
      conversion7dResult
    ] = await Promise.all([
      messageRepository.getMetricsToday(tenantId),
      simulationRepository.countToday(tenantId),
      groupBy
        ? (async () => {
            const db = await getDb();
            // attribution breakdown comes from attribution_clicks table, not public_events
            return db.execute(
              groupBy === 'utm_campaign'
                ? sql`
                    SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM attribution_clicks
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= NOW() - INTERVAL 7 DAY
                    GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `
                : sql`
                    SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM attribution_clicks
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= NOW() - INTERVAL 7 DAY
                    GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `,
            );
          })().catch(err => {
            logger.error('Failed to load attribution breakdown', err as Error, { tenantId, groupBy });
            return null;
          })
        : Promise.resolve(null),
      // pedidosHoje: orders created today for this tenant
      (async () => {
        const db = await getDb();
        const rows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              eq(orders.tenantId, tenantId),
              gte(orders.createdAt, sql`CURDATE()`)
            )
          );
        return rows[0]?.count ?? 0;
      })(),
      // erros24h: operational_events with error/failed event types in last 24h
      (async () => {
        const db = await getDb();
        const rows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(operationalEvents)
          .where(
            and(
              eq(operationalEvents.tenantId, tenantId),
              gte(operationalEvents.createdAt, sql`NOW() - INTERVAL 24 HOUR`),
              or(
                like(operationalEvents.eventType, '%FAILED%'),
                like(operationalEvents.eventType, '%ERROR%')
              )
            )
          );
        return rows[0]?.count ?? 0;
      })(),
      // handoffsHoje
      (async () => {
        const db = await getDb();
        const rows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(operationalEvents)
          .where(
            and(
              eq(operationalEvents.tenantId, tenantId),
              gte(operationalEvents.createdAt, sql`CURDATE()`),
              eq(operationalEvents.eventType, 'frank_assist_handoff')
            )
          );
        return rows[0]?.count ?? 0;
      })(),
      // timings (avg response and quote time)
      (async () => {
        const db = await getDb();
        const sevenDaysAgo = sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        const result = await db.execute(sql`
          WITH FirstInbound AS (
              SELECT conversation_id, MIN(created_at) as first_in
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'inbound'
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          ),
          FirstOutboundHuman AS (
              SELECT conversation_id, MIN(created_at) as first_out_human
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'outbound'
                AND source = 'OPERATOR'
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          ),
          FirstQuote AS (
              SELECT conversation_id, MIN(created_at) as first_quote
              FROM simulations
              WHERE tenant_id = ${tenantId}
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          )
          SELECT
              AVG(TIMESTAMPDIFF(SECOND, i.first_in, h.first_out_human)) as avgFirstResponseSec,
              AVG(TIMESTAMPDIFF(SECOND, i.first_in, q.first_quote)) as avgFirstQuoteSec
          FROM FirstInbound i
          LEFT JOIN FirstOutboundHuman h ON i.conversation_id = h.conversation_id AND h.first_out_human > i.first_in
          LEFT JOIN FirstQuote q ON i.conversation_id = q.conversation_id AND q.first_quote > i.first_in
        `);
        const rows = unwrapRows<{ avgFirstResponseSec: number | string | null; avgFirstQuoteSec: number | string | null }>(result);
        return rows[0] || { avgFirstResponseSec: null, avgFirstQuoteSec: null };
      })(),
      // conversionQuoteToOrder (7 days)
      (async () => {
        const db = await getDb();
        const sevenDaysAgo = sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        const [q] = await db.select({ count: sql<number>`COUNT(*)` }).from(simulations).where(and(eq(simulations.tenantId, tenantId), gte(simulations.createdAt, sevenDaysAgo)));
        const [o] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, sevenDaysAgo)));
        const quotes = Number(q?.count ?? 0);
        const ordersCount = Number(o?.count ?? 0);
        return quotes > 0 ? (ordersCount / quotes) * 100 : 0;
      })(),
    ]);

    const payload: CockpitMetrics = {
      mensagensHoje: Number(msgMetrics.total ?? 0),
      cotacoesHoje: Number(cotacoesHoje ?? 0),
      pedidosHoje: Number(pedidosResult),
      erros24h: Number(errosResult),
      tempoMedioRespostaMin: timingsResult.avgFirstResponseSec !== null ? Number(timingsResult.avgFirstResponseSec) / 60 : null,
      tempoMedioCotacaoMin: timingsResult.avgFirstQuoteSec !== null ? Number(timingsResult.avgFirstQuoteSec) / 60 : null,
      handoffsHoje: Number(handoffsResult),
      conversaoCotacaoPedido: Number(conversion7dResult),
    };

    if (groupBy && attributionBreakdownResult) {
      payload.attribution_breakdown_7d = buildAttributionBreakdown(
        groupBy,
        unwrapRows<{ bucket: string | null; count: number | string | null }>(attributionBreakdownResult),
      );
    }

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
