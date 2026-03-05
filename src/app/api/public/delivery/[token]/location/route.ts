import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '../../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../../infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '../../../../../../infra/security/rate-limiter';
import { domineEventsRepository } from '../../../../../../infra/repositories/domine-events.repository';
import { sha256Hex } from '../../../../../../infra/attribution/hash';

const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    timestamp: z.number().int().positive().optional(),
}).strict();

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return request.headers.get('x-real-ip');
}

/**
 * Public courier endpoint to send GPS coordinates.
 * Protected by signed JWT token embedded in the URL parameters and IP rate-limiting.
 */
async function handler(
    request: NextRequest,
    context: any // Fix for Next.js App Router context typing
): Promise<NextResponse> {
    const { token } = await context.params;
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/public/delivery/[token]/location';
    const startedAt = Date.now();

    try {
        const ipHash = sha256Hex(getClientIp(request)) ?? 'ip_unknown';
        const rateLimitKey = `public_delivery_location_ip:${ipHash}`;

        // Rate Limit per IP
        const rateDecision = await rateLimiter.limit('public_events', rateLimitKey, {
            windowSec: 60,
            max: 30, // Max 30 requests per minute
        });

        if (!rateDecision.allowed) {
            structuredLogger.warn('rate_limited', {
                requestId, route, eventType: 'RATE_LIMITED',
                keyHash: hashRateLimitKeyForLog(rateLimitKey),
                remaining: rateDecision.remaining,
            });
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
                rateDecision,
            );
        }

        // 1. Verify Token (scaffolding assumes JWT with { tenantId, deliveryId })
        let decoded: any;
        try {
            const secret = process.env.DELIVERY_TOKEN_SECRET || 'scaffolding-secret-key-for-local';
            decoded = jwt.verify(token, secret);
        } catch (err) {
            return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Invalid or expired tracking token');
        }

        const tenantId = decoded.tenantId;
        const deliveryId = decoded.deliveryId;

        if (!tenantId || !deliveryId) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Malformed tracking token');
        }

        // 2. Parse payload
        const rawBody = await request.text();
        let bodyObj: unknown;
        try { bodyObj = JSON.parse(rawBody); }
        catch { return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON payload'); }

        const parseResult = locationSchema.safeParse(bodyObj);
        if (!parseResult.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, parseResult.error.message);
        }

        const { lat, lng, accuracy, timestamp } = parseResult.data;

        // 3. Publish directly to DOMINE to offload database latency from mobile app
        const idempotencyKey = `loc-${deliveryId}-${timestamp || Date.now()}`;

        await domineEventsRepository.publish({
            tenantId,
            source: 'webhook', // Assuming this acts like an external incoming webhook
            type: 'DELIVERY_LOCATION_UPDATED',
            idempotencyKey,
            payloadJson: {
                deliveryId,
                lat,
                lng,
                accuracy,
                timestamp,
            }
        });

        return NextResponse.json({ ok: true });

    } catch (err) {
        structuredLogger.error('public_delivery_api_error', {
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
