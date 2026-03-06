import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '@/infra/http/request-trace';
import { attributionClickRepository } from '@/infra/repositories/attribution-click.repository';
import { normalizeAttributionSnapshot } from '@/infra/attribution/attribution.types';
import type { AttributionSnapshot } from '@/infra/attribution/attribution.types';
import { sha256Hex } from '@/infra/attribution/hash';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '@/infra/security/rate-limiter';
import { redisClient } from '@/infra/redis.client';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';
import { sanitizeQuoteIntentPayload } from '@/modules/cotacao-publica/sanitization';

const BODY_MAX_BYTES = 8 * 1024; // 8KB max

const quoteIntentSchema = z.object({
    originCep: z.string().regex(/^\d{8}$/),
    destinationCep: z.string().regex(/^\d{8}$/),
    weightInKg: z.number().positive(),
    widthCm: z.number().positive().optional().nullable(),
    heightCm: z.number().positive().optional().nullable(),
    lengthCm: z.number().positive().optional().nullable(),
    insuranceValue: z.number().positive().optional().nullable(),
    packageType: z.enum(['box', 'envelope']),
    clientTs: z.number().int().positive(),
    utmSource: z.string().max(128).optional().nullable(),
    utmMedium: z.string().max(128).optional().nullable(),
    utmCampaign: z.string().max(128).optional().nullable(),
    utmTerm: z.string().max(128).optional().nullable(),
    utmContent: z.string().max(128).optional().nullable(),
    referrer: z.string().max(128).optional().nullable(),
    landingPath: z.string().max(128).optional().nullable(),
}).strict();

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return request.headers.get('x-real-ip');
}

async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/public/cotacao/intent';
    const tenantId = process.env.PUBLIC_TENANT_ID || 'condstore-public'; // Fixed Tenant for public

    try {
        const rawIp = getClientIp(request);
        const ipHash = sha256Hex(rawIp) ?? 'ip_unknown';
        const rateLimitKey = `cotacao_intent_ip:${ipHash}`;

        // Rate Limit: 10 per minute per IP
        const rateDecisionMin = await rateLimiter.limit('cotacao_intent', rateLimitKey, {
            windowSec: 60,
            max: 10,
        });

        if (!rateDecisionMin.allowed) {
            structuredLogger.warn('cotacao_intent_rate_limited_min', {
                requestId, route, tenantId, eventType: 'RATE_LIMITED',
                keyHash: hashRateLimitKeyForLog(rateLimitKey),
            });
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded (min)'),
                rateDecisionMin,
            );
        }

        // Rate Limit 2: 100 per day per IP
        const rateLimitKeyDay = `cotacao_intent_ip_day:${ipHash}`;
        const rateDecisionDay = await rateLimiter.limit('cotacao_intent_day', rateLimitKeyDay, {
            windowSec: 86400,
            max: 100,
        });

        if (!rateDecisionDay.allowed) {
            structuredLogger.warn('cotacao_intent_rate_limited_day', {
                requestId, route, tenantId, eventType: 'RATE_LIMITED',
                keyHash: hashRateLimitKeyForLog(rateLimitKeyDay),
            });
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded (day)'),
                rateDecisionDay,
            );
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).length > BODY_MAX_BYTES) {
            return applyRateLimitHeaders(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Payload too large'), rateDecisionMin);
        }

        let bodyObj: unknown;
        try { bodyObj = JSON.parse(rawBody); }
        catch { return applyRateLimitHeaders(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON payload'), rateDecisionMin); }

        const sanitizedBody = sanitizeQuoteIntentPayload(bodyObj);
        const parseResult = quoteIntentSchema.safeParse({ ...sanitizedBody, clientTs: (bodyObj as any)?.clientTs });

        if (!parseResult.success) {
            return applyRateLimitHeaders(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid schema: ' + parseResult.error.message), rateDecisionMin);
        }

        // Identity
        let anonId = request.cookies.get('condstore_anon')?.value;
        let isNewAnonId = false;

        if (!anonId) {
            anonId = crypto.randomUUID();
            isNewAnonId = true;
        }

        const userAgent = request.headers.get('user-agent') || undefined;
        const uaHash = sha256Hex(userAgent) ?? 'ua_unknown';
        const attrCookie = request.cookies.get('condstore_attr')?.value?.trim() || null;
        let attributionId: string | undefined = undefined;

        if (attrCookie) {
            const click = await attributionClickRepository.getByToken(attrCookie);
            if (click) {
                attributionId = click.id;
            }
        } else {
            // Create minimal session cookie if none exists but we have UTMs
            const data = parseResult.data;
            if (data.utmSource || data.utmCampaign || data.referrer) {
                const tokenId = crypto.randomUUID();
                const clickId = crypto.randomUUID();
                await attributionClickRepository.upsertByToken({
                    tenantId,
                    token: tokenId,
                    landingUrl: data.landingPath,
                    utmSource: data.utmSource,
                    utmMedium: data.utmMedium,
                    utmCampaign: data.utmCampaign,
                    utmTerm: data.utmTerm,
                    utmContent: data.utmContent,
                    ipHash,
                    userAgentHash: uaHash,
                    clickId,
                });
                attributionId = clickId;
            }
        }

        // Register strategic fact
        const intentId = crypto.randomUUID();
        await publicEventsRepository.create({
            id: intentId,
            tenantId,
            anonId,
            eventType: 'quote_intent_created',
            attributionId,
            payloadJson: parseResult.data,
            ipHash,
            uaHash,
        });

        // Publish operational events (fire-and-forget — never blocks response)
        void (async () => {
            try {
                const { publishOperationalEvent } = await import('@/lib/events/operational-event-bus');
                const baseEvent = {
                    tenantId,
                    sessionId: anonId,
                    attributionId: attributionId ?? undefined,
                    payload: { intentId, utmSource: parseResult.data.utmSource ?? null },
                };
                if (attributionId) {
                    await publishOperationalEvent({ ...baseEvent, eventType: 'traffic_attributed', eventDomain: 'ACQUISITION' });
                }
                await publishOperationalEvent({ ...baseEvent, eventType: 'lead_created', eventDomain: 'ACQUISITION' });
            } catch { /* non-blocking */ }
        })();

        const response = NextResponse.json({ intentId, next: "upgrades_pending" });

        // Ensure headers exist correctly
        applyRateLimitHeaders(response, rateDecisionMin);

        if (isNewAnonId) {
            response.cookies.set('condstore_anon', anonId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 180, // 180 Dias
                path: '/',
            });
        }

        return response;

    } catch (err) {
        structuredLogger.error('cotacao_intent_api_error', {
            requestId,
            tenantId,
            route,
            eventType: 'route_error',
            errorCode: ErrorCode.UNKNOWN,
            error: err,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Error');
    }
}

export const POST = withRequestTrace(handler);
