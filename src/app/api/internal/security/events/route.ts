import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { securityEdgeEvents, securityIncidents } from '@/drizzle/schema';
import { desc, sql, gte } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
    const requestId = makeRequestId(request);

    // Only allow admins
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const now = new Date();
        const startOf24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Total events (all time)
        const [totalResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(securityEdgeEvents);

        const totalEvents = Number(totalResult?.count || 0);

        // 2. Events by type (all time)
        const eventsByTypeRaw = await db
            .select({
                reason: securityEdgeEvents.reason,
                count: sql<number>`count(*)`,
            })
            .from(securityEdgeEvents)
            .groupBy(securityEdgeEvents.reason);

        const eventsByType = eventsByTypeRaw.reduce((acc, row) => {
            acc[row.reason] = Number(row.count);
            return acc;
        }, {} as Record<string, number>);

        // 3. Top IP Hash (last 24h)
        const topIpHash = await db
            .select({
                ipHash: securityEdgeEvents.ipHash,
                count: sql<number>`count(*)`,
            })
            .from(securityEdgeEvents)
            .where(gte(securityEdgeEvents.createdAt, startOf24h))
            .groupBy(securityEdgeEvents.ipHash)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // 4. Top Routes (last 24h)
        const topRoutes = await db
            .select({
                route: securityEdgeEvents.route,
                count: sql<number>`count(*)`,
            })
            .from(securityEdgeEvents)
            .where(gte(securityEdgeEvents.createdAt, startOf24h))
            .groupBy(securityEdgeEvents.route)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // 5. Recent raw incidents (last 20 edge events)
        const incidents = await db
            .select({
                id: securityEdgeEvents.id,
                timestamp: securityEdgeEvents.createdAt,
                route: securityEdgeEvents.route,
                reason: securityEdgeEvents.reason,
                ipHash: securityEdgeEvents.ipHash,
                tenantClaim: securityEdgeEvents.tenantClaim,
            })
            .from(securityEdgeEvents)
            .orderBy(desc(securityEdgeEvents.createdAt))
            .limit(20);

        // 6. Events Last 24h (5min buckets)
        const bucketQuery = await db
            .select({
                bucket: sql<number>`(UNIX_TIMESTAMP(${securityEdgeEvents.createdAt}) DIV 300) * 300`,
                count: sql<number>`count(*)`,
            })
            .from(securityEdgeEvents)
            .where(gte(securityEdgeEvents.createdAt, startOf24h))
            .groupBy(sql`(UNIX_TIMESTAMP(${securityEdgeEvents.createdAt}) DIV 300) * 300`)
            .orderBy(sql`(UNIX_TIMESTAMP(${securityEdgeEvents.createdAt}) DIV 300) * 300`);

        const eventsLast24h = bucketQuery.map(row => ({
            timestamp: new Date(Number(row.bucket) * 1000).toISOString(),
            count: Number(row.count),
        }));

        // 7. Active anomaly incidents (security_incidents, last 5)
        const activeIncidents = await db
            .select()
            .from(securityIncidents)
            .orderBy(desc(securityIncidents.createdAt))
            .limit(5);

        return NextResponse.json({
            ok: true,
            data: {
                total_events: totalEvents,
                events_by_type: eventsByType,
                top_ip_hash: topIpHash.map(r => ({ ip_hash: r.ipHash, count: Number(r.count) })),
                top_routes: topRoutes.map(r => ({ route: r.route, count: Number(r.count) })),
                incidents: incidents.map(inc => ({
                    timestamp: inc.timestamp.toISOString(),
                    route: inc.route,
                    reason: inc.reason,
                    ip_hash: inc.ipHash,
                    tenant_claim: inc.tenantClaim,
                })),
                events_last_24h: eventsLast24h,
                active_incidents: activeIncidents.map(inc => ({
                    id: inc.id,
                    reason: inc.reason,
                    count: inc.count,
                    route: inc.route,
                    ip_hash: inc.ipHash,
                    window_start: inc.windowStart.toISOString(),
                    window_end: inc.windowEnd.toISOString(),
                    created_at: inc.createdAt.toISOString(),
                })),
            }
        });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to fetch security metrics');
    }
};
