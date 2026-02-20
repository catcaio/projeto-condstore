
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/infra/auth/session';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

let dbInstance: any = null;
async function getDb() {
    if (dbInstance) return dbInstance;
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
    const connectionPool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });
    dbInstance = drizzle(connectionPool, { mode: 'default' });
    return dbInstance;
}
import { freightFunnelEvents } from '@/drizzle/schema';
import { sql, and, gte, eq } from 'drizzle-orm';
import { getRedis } from "@/infra/redis.client";
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
        let tenantId: string;

        // DEV bypass: allow testing metrics endpoints
        if (
            process.env.NODE_ENV === 'development' &&
            process.env.COCKPIT_METRICS_DEV_BYPASS === '1'
        ) {
            // Get the first available tenant for DEV bypass testing
            const db = await getDb();
            const firstTenant = await db.select().from(require('@/drizzle/schema').tenants).limit(1);
            if (!firstTenant || firstTenant.length === 0) {
                return NextResponse.json({ error: 'No tenants found for dev bypass' }, { status: 400 });
            }
            tenantId = firstTenant[0].id;
        } else {
            // 1. Authenticate and get Tenant ID normally
            const user = await getSessionUser(request);
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            tenantId = user.tenantId;
        }

        // 2. Try Cache
        const cacheKey = `cockpit:metrics:funnel:${tenantId}`;
        const cachedData = await getRedis().get(cacheKey);
        if (cachedData) {
            return NextResponse.json(cachedData, {
                headers: {
                    'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                    'X-Cache': 'HIT',
                },
            });
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

        // 4. Calculate Rates (Sequential)
        // CEP / FLOW
        const cepRate = counts[FunnelStage.FLOW_STARTED] > 0
            ? counts[FunnelStage.CEP_PROVIDED] / counts[FunnelStage.FLOW_STARTED]
            : 0;

        // QTY / CEP
        const qtyRate = counts[FunnelStage.CEP_PROVIDED] > 0
            ? counts[FunnelStage.QUANTITY_PROVIDED] / counts[FunnelStage.CEP_PROVIDED]
            : 0;

        // QUOTE / QTY
        const quoteRate = counts[FunnelStage.QUANTITY_PROVIDED] > 0
            ? counts[FunnelStage.FREIGHT_QUOTED] / counts[FunnelStage.QUANTITY_PROVIDED]
            : 0;

        // Response Payload
        const responseData = {
            window_7d: {
                counts: {
                    flow_started: counts[FunnelStage.FLOW_STARTED],
                    cep_provided: counts[FunnelStage.CEP_PROVIDED],
                    quantity_provided: counts[FunnelStage.QUANTITY_PROVIDED],
                    freight_quoted: counts[FunnelStage.FREIGHT_QUOTED],
                },
                rates: {
                    cep_per_flow: Number(cepRate.toFixed(2)),
                    qty_per_cep: Number(qtyRate.toFixed(2)),
                    freight_per_qty: Number(quoteRate.toFixed(2)),
                },
            },
            // Placeholder for timeseries (can be implemented if needed, currently returning empty array to match previous structure idea)
            timeseries_14d: [],
        };

        // 5. Cache Result
        await getRedis().set(cacheKey, responseData, CACHE_TTL_SECONDS);

        return NextResponse.json(responseData, {
            headers: {
                'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
                'X-Cache': 'MISS',
            },
        });

    } catch (error) {
        console.error('Failed to fetch funnel metrics', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
