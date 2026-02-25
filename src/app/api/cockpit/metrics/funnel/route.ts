
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightFunnelEvents } from '@/drizzle/schema';
import { sql, and, gte, eq } from 'drizzle-orm';
import { redisClient } from "@/infra/redis.client";
import { logger } from '@/infra/logger';
import { buildAttributionBreakdown, isAttributionGroupBy, parseAttributionGroupBy, unwrapRows } from '@/modules/metrics/attribution-breakdown';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';

export enum FunnelStage {
    FLOW_STARTED = 'FLOW_STARTED',
    INTENT_DETECTED = 'INTENT_DETECTED',
    ASKED_CEP = 'ASKED_CEP',
    CEP_PROVIDED = 'CEP_PROVIDED',
    QUANTITY_PROVIDED = 'QUANTITY_PROVIDED',
    FREIGHT_QUOTED = 'FREIGHT_QUOTED',
    FLOW_ABORTED = 'FLOW_ABORTED'
}

// Cache TTL: 60 seconds
const CACHE_TTL_SECONDS = 60;

interface FunnelStageCountRow {
    stage: string | null;
    count: number | string | null;
}

interface FunnelMetricsResponse {
    window_7d: {
        counts: {
            flow_started: number;
            intent_detected: number;
            asked_cep: number;
            cep_provided: number;
            quantity_provided: number;
            freight_quoted: number;
            flow_aborted: number;
        };
        rates: {
            intent_per_flow: number;
            cep_per_asked: number;
            cep_provide_per_ask: number;
            qty_per_cep: number;
            quoted_per_qty: number;
        };
    };
    timeseries_14d: Array<unknown>;
    attribution_breakdown_7d?: {
        groupBy: 'utm_source' | 'utm_campaign';
        buckets: Array<{ key: string; count: number }>;
    };
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/cockpit/metrics/funnel';
    let tenantId: string | undefined;

    structuredLogger.info('cockpit_metrics_funnel_start', {
        requestId,
        route,
        eventType: 'route_start',
    });

    const finalize = (response: NextResponse, code?: ErrorCode) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('cockpit_metrics_funnel_end', {
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
        tenantId = auth.session.tenantId;

        // 2. Try Redis Cache (with availability guard)
        const cacheKey = `cockpit:metrics:funnel:${tenantId}`;
        try {
            if (!groupBy && redisClient.isAvailable()) {
                const cachedData = await redisClient.get<FunnelMetricsResponse>(cacheKey);
                if (cachedData) {
                    return finalize(NextResponse.json(cachedData, {
                        headers: {
                            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                            'X-Cache': 'HIT',
                            'X-Request-Id': requestId,
                        },
                    }));
                }
            }
        } catch (cacheErr) {
            logger.warn('Failed to read funnel cache', undefined, cacheErr as Error);
        }

        // 3. Query DB
        const db = await getDb();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Aggregate counts by stage for the last 7 days
        const result: FunnelStageCountRow[] = await db
            .select({
                stage: freightFunnelEvents.stage,
                count: sql<number>`count(*)`,
            })
            .from(freightFunnelEvents)
            .where(
                and(
                    eq(freightFunnelEvents.tenantId, tenantId),
                    gte(freightFunnelEvents.createdAt, sevenDaysAgo)
                )
            )
            .groupBy(freightFunnelEvents.stage);

        // Map results to counts object
        const counts: Record<FunnelStage, number> = {
            [FunnelStage.FLOW_STARTED]: 0,
            [FunnelStage.INTENT_DETECTED]: 0,
            [FunnelStage.ASKED_CEP]: 0,
            [FunnelStage.CEP_PROVIDED]: 0,
            [FunnelStage.QUANTITY_PROVIDED]: 0,
            [FunnelStage.FREIGHT_QUOTED]: 0,
            [FunnelStage.FLOW_ABORTED]: 0,
        };

        result.forEach((row) => {
            if (!row.stage || !(row.stage in counts)) {
                return;
            }

            counts[row.stage as FunnelStage] = Number(row.count ?? 0);
        });

        // 4. Calculate Rates (full granular pipeline)
        const intentRate = counts[FunnelStage.FLOW_STARTED] > 0
            ? counts[FunnelStage.INTENT_DETECTED] / counts[FunnelStage.FLOW_STARTED]
            : 0;

        const cepAskRate = counts[FunnelStage.INTENT_DETECTED] > 0
            ? counts[FunnelStage.ASKED_CEP] / counts[FunnelStage.INTENT_DETECTED]
            : 0;

        const cepProvideRate = counts[FunnelStage.ASKED_CEP] > 0
            ? counts[FunnelStage.CEP_PROVIDED] / counts[FunnelStage.ASKED_CEP]
            : 0;

        const qtyRate = counts[FunnelStage.CEP_PROVIDED] > 0
            ? counts[FunnelStage.QUANTITY_PROVIDED] / counts[FunnelStage.CEP_PROVIDED]
            : 0;

        const quoteRate = counts[FunnelStage.QUANTITY_PROVIDED] > 0
            ? counts[FunnelStage.FREIGHT_QUOTED] / counts[FunnelStage.QUANTITY_PROVIDED]
            : 0;

        let attributionBreakdown: FunnelMetricsResponse['attribution_breakdown_7d'] | undefined;
        if (groupBy) {
            const attributionResult = await db.execute(
                groupBy === 'utm_campaign'
                    ? sql`
                        SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
                        FROM freight_funnel_events
                        WHERE tenant_id = ${tenantId}
                          AND created_at >= ${sevenDaysAgo}
                          AND stage = ${FunnelStage.FLOW_STARTED}
                        GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                        ORDER BY count DESC, bucket ASC
                    `
                    : sql`
                        SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                        FROM freight_funnel_events
                        WHERE tenant_id = ${tenantId}
                          AND created_at >= ${sevenDaysAgo}
                          AND stage = ${FunnelStage.FLOW_STARTED}
                        GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
                        ORDER BY count DESC, bucket ASC
                    `,
            );

            attributionBreakdown = buildAttributionBreakdown(
                groupBy,
                unwrapRows<{ bucket: string | null; count: number | string | null }>(attributionResult),
            );
        }

        // 5. Build Response Payload
        const responseData: FunnelMetricsResponse = {
            window_7d: {
                counts: {
                    flow_started: counts[FunnelStage.FLOW_STARTED],
                    intent_detected: counts[FunnelStage.INTENT_DETECTED],
                    asked_cep: counts[FunnelStage.ASKED_CEP],
                    cep_provided: counts[FunnelStage.CEP_PROVIDED],
                    quantity_provided: counts[FunnelStage.QUANTITY_PROVIDED],
                    freight_quoted: counts[FunnelStage.FREIGHT_QUOTED],
                    flow_aborted: counts[FunnelStage.FLOW_ABORTED],
                },
                rates: {
                    intent_per_flow: Number(intentRate.toFixed(2)),
                    cep_per_asked: Number(cepAskRate.toFixed(2)),
                    cep_provide_per_ask: Number(cepProvideRate.toFixed(2)),
                    qty_per_cep: Number(qtyRate.toFixed(2)),
                    quoted_per_qty: Number(quoteRate.toFixed(2)),
                },
            },
            timeseries_14d: [],
        };
        if (attributionBreakdown) {
            responseData.attribution_breakdown_7d = attributionBreakdown;
        }

        // 6. Cache Result (fire-and-forget with availability guard)
        try {
            if (!groupBy && redisClient.isAvailable()) {
                redisClient.set(cacheKey, responseData, CACHE_TTL_SECONDS).catch(() => { });
            }
        } catch (_) { }

        return finalize(NextResponse.json(responseData, {
            headers: {
                'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                'X-Cache': 'MISS',
                'X-Request-Id': requestId,
            },
        }));

    } catch (error) {
        structuredLogger.error('cockpit_metrics_funnel_failed', {
            requestId,
            tenantId,
            route,
            eventType: 'route_error',
            durationMs: Date.now() - startedAt,
            errorCode: ErrorCode.DB_ERROR,
            error,
        });
        return finalize(errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load funnel metrics'), ErrorCode.DB_ERROR);
    }
}
