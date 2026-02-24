
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/infra/auth/session';
import { getDb } from '@/infra/db';
import { freightFunnelEvents } from '@/drizzle/schema';
import { sql, and, gte, eq } from 'drizzle-orm';
import { redisClient } from "@/infra/redis.client";
import { logger } from '@/infra/logger';

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

export async function GET(request: NextRequest) {
    try {
        const user = await getSessionUser(request);
        if (!user?.tenantId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }
        const tenantId = user.tenantId;

        // 2. Try Redis Cache (with availability guard)
        const cacheKey = `cockpit:metrics:funnel:${tenantId}`;
        try {
            if (redisClient.isAvailable()) {
                const cachedData = await redisClient.get<any>(cacheKey);
                if (cachedData) {
                    return NextResponse.json(cachedData, {
                        headers: {
                            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                            'X-Cache': 'HIT',
                        },
                    });
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
        const result = await db
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
        const counts = {
            [FunnelStage.FLOW_STARTED]: 0,
            [FunnelStage.INTENT_DETECTED]: 0,
            [FunnelStage.ASKED_CEP]: 0,
            [FunnelStage.CEP_PROVIDED]: 0,
            [FunnelStage.QUANTITY_PROVIDED]: 0,
            [FunnelStage.FREIGHT_QUOTED]: 0,
            [FunnelStage.FLOW_ABORTED]: 0,
        };

        result.forEach((row: any) => {
            const stage = row.stage as FunnelStage;
            if (stage in counts) {
                counts[stage as keyof typeof counts] = Number(row.count);
            }
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

        // 5. Build Response Payload
        const responseData = {
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

        // 6. Cache Result (fire-and-forget with availability guard)
        try {
            if (redisClient.isAvailable()) {
                redisClient.set(cacheKey, responseData, CACHE_TTL_SECONDS).catch(() => { });
            }
        } catch (_) { }

        return NextResponse.json(responseData, {
            headers: {
                'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                'X-Cache': 'MISS',
            },
        });

    } catch (error) {
        logger.error('Failed to fetch funnel metrics', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
