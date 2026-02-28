import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { getRateLimiterFallbackMetrics } from '@/infra/security/rate-limiter';
import { circuitBreaker } from '@/infra/security/circuit-breaker';
import { redisClient } from '@/infra/redis.client';
import { getDb } from '@/infra/db';
import { eq } from 'drizzle-orm';
import { tenants } from '@/drizzle/schema';

export async function GET(req: NextRequest, { params }: { params: { tenantId: string } }) {
    const requestId = makeRequestId(req);
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    if (auth.session.tenantId !== params.tenantId) {
        return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    try {
        const fallbacks = getRateLimiterFallbackMetrics();
        let redisOk = false;
        try {
            if (redisClient.isAvailable()) {
                const raw = redisClient.getRawClient();
                const p = raw ? await raw.ping() : null;
                if (p === 'PONG') redisOk = true;
            }
        } catch (e) { }

        const db = await getDb();
        const tenantResult = await db.select()
            .from(tenants)
            .where(eq(tenants.id, params.tenantId))
            .limit(1);
        const tenant = tenantResult[0];

        const circuitBreakers = circuitBreaker.getStatus().filter(cb => cb.tenantId === params.tenantId);

        return NextResponse.json({
            redis: redisOk ? 'ok' : 'fail',
            rateLimiterFallback: fallbacks,
            circuitBreakers,
            outboundEnabled: tenant?.outboundEnabled,
            incidentMode: tenant?.incidentMode,
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch health summary' }, { status: 500 });
    }
}
