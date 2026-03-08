import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightConfirmations, freightSimulations } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/freight/insights
 *
 * Returns aggregated freight intelligence:
 * - topCeps: most frequently quoted destination CEPs
 * - topCarriers: most used carriers by confirmation count
 * - avgDelta: average freight delta (confirmed - quoted)
 * - topRoutes: top cepPrefix → carrier combinations
 */
export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    try {
        const db = await getDb();

        // Fetch all confirmations for tenant (limit to last 1000 for performance)
        const allConfirmations = await db
            .select()
            .from(freightConfirmations)
            .where(eq(freightConfirmations.tenantId, tenantId))
            .orderBy(desc(freightConfirmations.createdAt))
            .limit(1000);

        // Fetch recent simulations for cep stats
        const allSimulations = await db
            .select()
            .from(freightSimulations)
            .where(eq(freightSimulations.tenantId, tenantId))
            .orderBy(desc(freightSimulations.createdAt))
            .limit(1000);

        // --- Top CEPs (from simulations) ---
        const cepCounts = new Map<string, number>();
        for (const sim of allSimulations) {
            const cep = sim.cep;
            cepCounts.set(cep, (cepCounts.get(cep) ?? 0) + 1);
        }
        const topCeps = Array.from(cepCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([cep, count]) => ({ cep, count }));

        // --- Top Carriers (from confirmations) ---
        const carrierCounts = new Map<string, number>();
        for (const conf of allConfirmations) {
            const cn = conf.carrierName;
            carrierCounts.set(cn, (carrierCounts.get(cn) ?? 0) + 1);
        }
        const topCarriers = Array.from(carrierCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([carrier, count]) => ({ carrier, count }));

        // --- Average Delta ---
        let totalDelta = 0;
        let deltaCount = 0;
        for (const conf of allConfirmations) {
            if (conf.deltaValue != null) {
                totalDelta += parseFloat(String(conf.deltaValue));
                deltaCount++;
            }
        }
        const avgDelta = deltaCount > 0 ? Math.round((totalDelta / deltaCount) * 100) / 100 : null;

        // --- Top Routes (cepPrefix → carrierName) ---
        const routeKey = (cepPrefix: string | null, carrier: string) =>
            `${cepPrefix ?? 'unknown'}→${carrier}`;
        const routeCounts = new Map<string, { cepPrefix: string; carrier: string; count: number }>();
        for (const conf of allConfirmations) {
            const key = routeKey(conf.cepPrefix, conf.carrierName);
            const existing = routeCounts.get(key);
            if (existing) {
                existing.count++;
            } else {
                routeCounts.set(key, {
                    cepPrefix: conf.cepPrefix,
                    carrier: conf.carrierName,
                    count: 1,
                });
            }
        }
        const topRoutes = Array.from(routeCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            ok: true,
            data: {
                topCeps,
                topCarriers,
                avgDelta,
                deltaCount,
                totalSimulations: allSimulations.length,
                totalConfirmations: allConfirmations.length,
                topRoutes,
            },
        });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
