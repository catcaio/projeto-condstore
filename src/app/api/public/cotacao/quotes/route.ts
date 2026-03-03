import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '@/infra/http/request-trace';
import { sha256Hex } from '@/infra/attribution/hash';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '@/infra/security/rate-limiter';
import { redisClient } from '@/infra/redis.client';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';
import { getDb } from '@/infra/db';
import { publicEvents } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSimulatedQuotes } from '@/modules/shipping/simulated/simulated-quote-engine';
import type { QuoteInput } from '@/modules/shipping/carriers/types';
import { sanitizeQuoteIntentPayload } from '@/modules/cotacao-publica/sanitization';

const CACHE_TTL_SECONDS = 600; // 10 minutes

const intentIdSchema = z.string().uuid();

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return request.headers.get('x-real-ip');
}

async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/public/cotacao/quotes';
    const tenantId = process.env.PUBLIC_TENANT_ID || 'condstore-public';

    try {
        // --- Rate Limit ---
        const rawIp = getClientIp(request);
        const ipHash = sha256Hex(rawIp) ?? 'ip_unknown';
        const rateLimitKey = `cotacao_quotes_ip:${ipHash}`;

        const rateDecision = await rateLimiter.limit('cotacao_quotes', rateLimitKey, {
            windowSec: 60,
            max: 30,
        });

        if (!rateDecision.allowed) {
            structuredLogger.warn('cotacao_quotes_rate_limited', {
                requestId, route, tenantId, eventType: 'RATE_LIMITED',
                keyHash: hashRateLimitKeyForLog(rateLimitKey),
            });
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
                rateDecision,
            );
        }

        // --- Validate intentId ---
        const url = new URL(request.url);
        const intentIdRaw = url.searchParams.get('intentId');

        if (!intentIdRaw || !intentIdSchema.safeParse(intentIdRaw).success) {
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing or invalid intentId'),
                rateDecision,
            );
        }

        // --- Cookie validation ---
        const anonId = request.cookies.get('condstore_anon')?.value;
        if (!anonId) {
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.AUTH_REQUIRED, 403, requestId, 'Anonymous session required'),
                rateDecision,
            );
        }

        // --- Check Redis cache ---
        const cacheKey = `cotacao:quotes:${intentIdRaw}`;
        const cached = await redisClient.get<Record<string, unknown>>(cacheKey);
        if (cached) {
            return applyRateLimitHeaders(NextResponse.json(cached), rateDecision);
        }

        // --- Fetch intent from DB ---
        const db = await getDb();
        const intentRows = await db
            .select()
            .from(publicEvents)
            .where(
                and(
                    eq(publicEvents.id, intentIdRaw),
                    eq(publicEvents.eventType, 'quote_intent_created'),
                ),
            )
            .limit(1);

        const intent = intentRows[0];
        if (!intent) {
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Intent not found'),
                rateDecision,
            );
        }

        // Verify anonId matches
        if (intent.anonId !== anonId) {
            return applyRateLimitHeaders(
                errorResponse(ErrorCode.AUTH_REQUIRED, 403, requestId, 'Session mismatch'),
                rateDecision,
            );
        }

        // --- Generate simulated quotes ---
        const payload = intent.payloadJson as Record<string, unknown>;
        const quoteInput: QuoteInput = {
            originCep: String(payload?.originCep ?? '00000000'),
            destinationCep: String(payload?.destinationCep ?? '00000000'),
            weightInKg: Number(payload?.weightInKg ?? 1),
            widthCm: payload?.widthCm ? Number(payload.widthCm) : undefined,
            heightCm: payload?.heightCm ? Number(payload.heightCm) : undefined,
            lengthCm: payload?.lengthCm ? Number(payload.lengthCm) : undefined,
            insuranceValue: payload?.insuranceValue ? Number(payload.insuranceValue) : undefined,
            packageType: (payload?.packageType as 'box' | 'envelope') ?? 'box',
        };

        const { quotes, bestPriceId, bestSpeedId } = getSimulatedQuotes(quoteInput, intentIdRaw);

        // Sanitized quote payload for event logging (no PII)
        const sanitizedQuotesPayload = quotes.map((q) => ({
            carrierCode: q.carrierCode,
            serviceName: q.serviceName,
            price: q.price,
            estimatedDeliveryDays: q.estimatedDeliveryDays,
        }));

        // --- Log event ---
        await publicEventsRepository.create({
            id: crypto.randomUUID(),
            tenantId,
            anonId,
            eventType: 'cotacao_quotes_generated',
            attributionId: intent.attributionId ?? undefined,
            payloadJson: {
                intentId: intentIdRaw,
                quotesCount: quotes.length,
                bestPriceId,
                bestSpeedId,
                simulated: true,
                quotes: sanitizedQuotesPayload,
            },
            ipHash,
            uaHash: sha256Hex(request.headers.get('user-agent')) ?? 'ua_unknown',
        });

        const responseBody = {
            intentId: intentIdRaw,
            simulated: true,
            quotes,
            bestPriceId,
            bestSpeedId,
        };

        // --- Cache in Redis ---
        try {
            await redisClient.set(cacheKey, responseBody, CACHE_TTL_SECONDS);
        } catch { /* non-fatal */ }

        return applyRateLimitHeaders(NextResponse.json(responseBody), rateDecision);

    } catch (err) {
        structuredLogger.error('cotacao_quotes_api_error', {
            requestId, tenantId, route,
            eventType: 'route_error',
            errorCode: ErrorCode.UNKNOWN,
            error: err,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Error');
    }
}

export const GET = withRequestTrace(handler);
