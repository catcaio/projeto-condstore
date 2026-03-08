import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightSimulations, freightConfirmations, freightMemory } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const db = await getDb();

    // Panel 1: Most repeated CEP prefixes
    const topCepPrefixes = await db.select({
        cepPrefix: freightSimulations.cepPrefix,
        count: sql<number>`COUNT(*)`.as('count'),
    }).from(freightSimulations)
        .where(eq(freightSimulations.tenantId, tenantId))
        .groupBy(freightSimulations.cepPrefix)
        .orderBy(desc(sql`count`))
        .limit(10);

    // Panel 2: Top carriers by confirmation success
    const topCarriers = await db.select({
        carrierName: freightConfirmations.carrierName,
        count: sql<number>`COUNT(*)`.as('count'),
    }).from(freightConfirmations)
        .where(eq(freightConfirmations.tenantId, tenantId))
        .groupBy(freightConfirmations.carrierName)
        .orderBy(desc(sql`count`))
        .limit(10);

    // Panel 3: Average delta by carrier
    const avgDeltaByCarrier = await db.select({
        carrierName: freightConfirmations.carrierName,
        avgDelta: sql<string>`ROUND(AVG(CAST(delta_value AS DECIMAL(10,2))), 2)`.as('avg_delta'),
        count: sql<number>`COUNT(*)`.as('count'),
    }).from(freightConfirmations)
        .where(eq(freightConfirmations.tenantId, tenantId))
        .groupBy(freightConfirmations.carrierName)
        .orderBy(desc(sql`count`))
        .limit(10);

    // Panel 4: Zones with largest price divergence (anomalies from memory)
    const zoneDivergence = await db.select({
        zoneCode: freightMemory.zoneCode,
        carrierName: freightMemory.carrierName,
        avgDelta: freightMemory.avgDelta,
        avgConfirmedFreight: freightMemory.avgConfirmedFreight,
        confirmationsCount: freightMemory.confirmationsCount,
        confidenceScore: freightMemory.confidenceScore,
    }).from(freightMemory)
        .where(eq(freightMemory.tenantId, tenantId))
        .orderBy(desc(sql`ABS(CAST(avg_delta AS DECIMAL(10,2)))`))
        .limit(10);

    return NextResponse.json({
        ok: true,
        data: {
            topCepPrefixes,
            topCarriers,
            avgDeltaByCarrier,
            zoneDivergence,
        },
    });
}
