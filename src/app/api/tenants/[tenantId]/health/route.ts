import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { getRateLimiterFallbackMetrics } from '@/infra/security/rate-limiter';
import { circuitBreaker } from '@/infra/security/circuit-breaker';
import { redisClient } from '@/infra/redis.client';
import { getDb } from '@/infra/db';
import { eq, sql } from 'drizzle-orm';
import { tenants } from '@/drizzle/schema';

import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { tenantSecretsRepository } from '@/infra/repositories/tenant-secrets.repository';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
    const requestId = makeRequestId(req);
    const resolvedParams = await params;
    const tenantIdFromRoute = resolvedParams.tenantId;

    // 1. Session and Tenant Match
    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    // 2. Admin verification
    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    // 3. Rate Limit
    const limitDecision = await rateLimiter.limit('health_api', `tenant:${tenantIdFromRoute}`, {
        windowSec: 60,
        max: 30,
    });

    if (!limitDecision.allowed) {
        return applyRateLimitHeaders(
            errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
            limitDecision
        );
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

        let dbOk = false;
        const db = await getDb();
        try {
            await db.execute(sql`SELECT 1`);
            dbOk = true;
        } catch (e) { }

        const tenantResult = await db.select()
            .from(tenants)
            .where(eq(tenants.id, tenantIdFromRoute))
            .limit(1);
        const tenant = tenantResult[0];

        const circuitBreakers = circuitBreaker.getStatus().filter(cb => cb.tenantId === tenantIdFromRoute);

        const allSecretsMeta = await tenantSecretsRepository.getMetadataByTenant(tenantIdFromRoute);
        const unverifiedSecrets = allSecretsMeta.filter(s => s.lastVerifiedAt === null && s.lastRotatedAt !== null).map(s => s.scope);

        return NextResponse.json({
            db: dbOk ? 'ok' : 'fail',
            redis: redisOk ? 'ok' : 'fail',
            rateLimiterFallback: fallbacks,
            circuitBreakers,
            outboundEnabled: tenant?.outboundEnabled,
            incidentMode: tenant?.incidentMode,
            unverifiedSecrets,
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch health summary' }, { status: 500 });
    }
}
