import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { resolveTwilioConfig } from '@/config/twilio.config';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { makeRequestId } from '@/infra/http/request-trace';
import { structuredLogger } from '@/infra/log/logger';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';
import { sql } from 'drizzle-orm';
import { secretResolver } from '@/infra/security/secret-resolver';
import { tenantSecretsRepository } from '@/infra/repositories/tenant-secrets.repository';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';

import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    // 1. Session and Tenant Match
    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    // 2. Admin verification
    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    // Rate Limiter
    const rlDecision = await rateLimiter.limit('secrets.test', guard.tenantId, {
        max: 10,
        windowSec: 60,
    });

    if (!rlDecision.allowed) {
        const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        return applyRateLimitHeaders(res, rlDecision);
    }

    try {
        const body = await req.json();
        const { scope } = body;

        let testResult = false;
        let message = '';

        if (scope === 'twilio') {
            const config = await resolveTwilioConfig(guard.tenantId);
            // Let's do a simple GET to Twilio's Account object
            const twilioRes = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
                {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
                    }
                }
            );
            testResult = twilioRes.ok;
            message = twilioRes.ok ? 'Twilio credentials verified' : 'Invalid Twilio credentials';
        } else if (scope === 'stripe') {
            // For Stripe, we just verify the webhook secret format
            const whsec = await secretResolver.getValue(guard.tenantId, 'stripe', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET');
            if (whsec && whsec.startsWith('whsec_')) {
                testResult = true;
                message = 'Stripe webhook secret format looks valid';
            } else {
                message = 'Invalid pattern, should start with whsec_';
            }
        } else if (scope === 'internal') {
            // Test DB and Redis
            let dbOk = false;
            let redisOk = false;

            try {
                const db = await getDb();
                await db.execute(sql`SELECT 1`);
                dbOk = true;
            } catch (e) { }

            try {
                if (redisClient.isAvailable()) {
                    const raw = redisClient.getRawClient();
                    const p = raw ? await raw.ping() : null;
                    if (p === 'PONG') redisOk = true;
                }
            } catch (e) { }

            testResult = dbOk && redisOk;
            message = `DB: ${dbOk ? 'OK' : 'FAIL'}, Redis: ${redisOk ? 'OK' : 'FAIL'}`;
        } else {
            testResult = true;
            message = 'Default OK';
        }

        if (testResult) {
            await tenantSecretsRepository.markScopeAsVerified(guard.tenantId, scope);
            await adminAuditLogRepository.log({
                tenantId: guard.tenantId,
                userId: guard.sessionUser.sub,
                action: 'SECRET_VERIFIED',
                metadata: { scope, requestId }
            });
        }

        // Log the test action (audit)
        // We only log if it's admin doing a test on a critical integration
        structuredLogger.info('Secret test executed', {
            tenantId: guard.tenantId,
            scope,
            userId: guard.sessionUser.sub,
            testResult,
        });

        const res = NextResponse.json({ ok: testResult, message });
        return applyRateLimitHeaders(res, rlDecision);
    } catch (error: any) {
        structuredLogger.error('Failed to test secret', { err: error.message, tenantId: guard.tenantId ?? (await params).tenantId, requestId });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
