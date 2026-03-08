import { NextRequest, NextResponse } from 'next/server';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';
import { getDb } from '@/infra/db';
import { securityEdgeEvents, securityIncidents } from '@/drizzle/schema';
import { gte } from 'drizzle-orm';
import { detectSecurityAnomalies } from '@/lib/security/anomaly-detector';
import { structuredLogger } from '@/infra/log/logger';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
    const requestId = makeRequestId(request);

    const auth = await requireInternalAuth(request, { purpose: ['jobs'] });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const now = new Date();
        const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // last 5 minutes

        // Fetch events within the window
        const events = await db
            .select()
            .from(securityEdgeEvents)
            .where(gte(securityEdgeEvents.createdAt, windowStart));

        // Detect anomalies
        const breaches = detectSecurityAnomalies(events, windowStart, now);

        if (breaches.length === 0) {
            return NextResponse.json({
                ok: true,
                data: { scanned: events.length, breaches: 0, incidents_created: 0 }
            });
        }

        // Insert detected incidents
        const inserts = breaches.map(breach => ({
            id: randomUUID(),
            reason: breach.reason,
            count: breach.count,
            route: breach.route ?? undefined,
            ipHash: breach.ipHash ?? undefined,
            windowStart: breach.windowStart,
            windowEnd: breach.windowEnd,
        }));

        await db.insert(securityIncidents).values(inserts);

        for (const breach of breaches) {
            structuredLogger.warn('security_anomaly_detected', {
                requestId,
                reason: breach.reason,
                count: breach.count,
                route: breach.route ?? undefined,
                ipHash: breach.ipHash ?? undefined,
                windowStart: breach.windowStart.toISOString(),
                windowEnd: breach.windowEnd.toISOString(),
            });
        }

        return NextResponse.json({
            ok: true,
            data: {
                scanned: events.length,
                breaches: breaches.length,
                incidents_created: inserts.length,
                details: breaches.map(b => ({ reason: b.reason, count: b.count })),
            }
        });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to run anomaly scan');
    }
};
