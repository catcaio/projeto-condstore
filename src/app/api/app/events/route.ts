import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '../../../../infra/auth/guards';
import { getDb } from '../../../../infra/db';
import { tenantEvents } from '../../../../drizzle/schema';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { structuredLogger } from '../../../../infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '../../../../infra/security/rate-limiter';
import { redisClient } from '../../../../infra/redis.client';
import { sha256Hex } from '../../../../infra/attribution/hash';
import crypto from 'node:crypto';

const BODY_MAX_BYTES = 16 * 1024;

const appEventSchema = z.object({
    type: z.enum(['signup_created', 'store_connected', 'first_freight_simulation', 'first_whatsapp_message', 'cockpit_viewed', 'module_clicked']),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
    ts: z.number().int().positive(),
}).strict();

// Clean sensitive data from metadata
function cleanMetadata(metadata: Record<string, any> | undefined | null): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(metadata)) {
        if (/email|phone|cpf|password|secret/i.test(k)) continue;

        let valueStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (valueStr.length > 200) valueStr = valueStr.substring(0, 200) + '...';
        cleaned[k] = valueStr;
    }
    return cleaned;
}

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return request.headers.get('x-real-ip');
}

async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/app/events';
    const startedAt = Date.now();

    try {
        const sessionResult = await requireSession(request);
        if (!sessionResult.ok) {
            return sessionResult.response;
        }

        const tenantId = sessionResult.session.tenantId;

        const ipHash = sha256Hex(getClientIp(request)) ?? 'ip_unknown';
        const rateLimitKey = `app_events_ip:${ipHash}:${tenantId}`;

        const rateDecision = await rateLimiter.limit('app_events', rateLimitKey, {
            windowSec: 60,
            max: 60, // 1 per sec
        });

        if (!rateDecision.allowed) {
            structuredLogger.warn('rate_limited', {
                requestId, route, tenantId, eventType: 'RATE_LIMITED',
                keyHash: hashRateLimitKeyForLog(rateLimitKey),
                remaining: rateDecision.remaining,
            });
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
                rateDecision,
            );
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).length > BODY_MAX_BYTES) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Payload too large');
        }

        let bodyObj: unknown;
        try { bodyObj = JSON.parse(rawBody); }
        catch { return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON payload'); }

        const parseResult = appEventSchema.safeParse(bodyObj);
        if (!parseResult.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid schema: ' + parseResult.error.message);
        }

        const { type, metadata, ts } = parseResult.data;

        // Dedup Bucket server-side for milestones (unique per tenantId + type)
        // Store for 7 days in redis, but the real dedup happens because we just want ONE per tenant anyway.
        // Let's use 24h dedup for cockpit_viewed and module_clicked, and infinite (or 365 days) for the others.
        let dedupKey: string;
        let ttl: number;
        
        if (type === 'cockpit_viewed') {
            dedupKey = `dedup:appev:${tenantId}:${type}:${new Date().toISOString().split('T')[0]}`;
            ttl = 24 * 60 * 60;
        } else if (type === 'module_clicked') {
            const moduleId = metadata?.module || 'unknown';
            const moduleKey = moduleId === 'unknown' ? 'unknown' : sha256Hex(String(moduleId));
            // Dedup clicks to the same module per day per tenant to avoid noise, still gets basic usage stats.
            dedupKey = `dedup:appev:${tenantId}:${type}:${moduleKey}:${new Date().toISOString().split('T')[0]}`;
            ttl = 24 * 60 * 60;
        } else {
            dedupKey = `dedup:appev:${tenantId}:${type}`;
            ttl = 365 * 24 * 60 * 60;
        }

        const isSet = await redisClient.setNx(dedupKey, '1', ttl);
        if (!isSet) {
            // Already tracked
            return NextResponse.json({ ok: true, dedup: true });
        }

        const cleanedProps = cleanMetadata(metadata);

        const db = await getDb();
        await db.insert(tenantEvents).values({
            id: crypto.randomUUID(),
            tenantId,
            type: type,
            payload: JSON.stringify({
                userId: sessionResult.session.sub,
                requestId,
                metadata: cleanedProps,
                clientTs: ts,
            }),
        });

        return NextResponse.json({ ok: true });

    } catch (err) {
        structuredLogger.error('app_events_api_unhandled', {
            requestId,
            route,
            eventType: 'route_error',
            durationMs: Date.now() - startedAt,
            errorCode: ErrorCode.UNKNOWN,
            error: err,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Error');
    }
}

export const POST = withRequestTrace(handler);
