import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyticsService } from '../../../../modules/analytics/analytics.service';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '../../../../infra/http/request-trace';
import { attributionClickRepository } from '../../../../infra/repositories/attribution-click.repository';
import { normalizeAttributionSnapshot } from '../../../../infra/attribution/attribution.types';
import type { AttributionSnapshot } from '../../../../infra/attribution/attribution.types';
import { sha256Hex } from '../../../../infra/attribution/hash';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { structuredLogger } from '../../../../infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '../../../../infra/security/rate-limiter';
import { redisClient } from '../../../../infra/redis.client';

const BODY_MAX_BYTES = 16 * 1024; // 16KB max
const PROPS_MAX_CHARS = 2000;
const UTM_MAX_LENGTH = 128;

const eventSchema = z.object({
    type: z.string().min(1).max(64),
    page: z.string().min(1).max(100),
    section: z.string().min(1).max(100),
    element: z.string().max(100).optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
    ts: z.number().int().positive(),
}).strict();

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return request.headers.get('x-real-ip');
}

function capNullable(value: string | null | undefined, maxLength: number): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

function sanitizeAttributionUtmFields(attribution: AttributionSnapshot | null): AttributionSnapshot | null {
    if (!attribution) return null;
    return {
        ...attribution,
        utmSource: capNullable(attribution.utmSource ?? null, UTM_MAX_LENGTH),
        utmMedium: capNullable(attribution.utmMedium ?? null, UTM_MAX_LENGTH),
        utmCampaign: capNullable(attribution.utmCampaign ?? null, UTM_MAX_LENGTH),
        utmTerm: capNullable(attribution.utmTerm ?? null, UTM_MAX_LENGTH),
        utmContent: capNullable(attribution.utmContent ?? null, UTM_MAX_LENGTH),
    };
}

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

async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/public/events';
    const startedAt = Date.now();
    const tenantId = 'condstore-public'; // Fixed Tenant for public events

    try {
        const ipHash = sha256Hex(getClientIp(request)) ?? 'ip_unknown';
        const rateLimitKey = `public_events_ip:${ipHash}`;

        // Rate Limit per IP
        const rateDecision = await rateLimiter.limit('public_events', rateLimitKey, {
            windowSec: 60,
            max: 120, // 2 per sec
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

        const parseResult = eventSchema.safeParse(bodyObj);
        if (!parseResult.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid schema: ' + parseResult.error.message);
        }

        const { type, page, section, element, metadata, ts } = parseResult.data;

        // Dedup Bucket 10s: requestId + type + element + ts
        const dedupHash = sha256Hex(`${ipHash}:${type}:${element ?? 'none'}:${ts}`);
        if (dedupHash) {
            const isSet = await redisClient.setNx(`dedup:pubev:${dedupHash}`, '1', 10);
            if (!isSet) {
                // Return 200 for dedup to not spam client errors
                return NextResponse.json({ ok: true, dedup: true });
            }
        }

        const cleanedProps = cleanMetadata(metadata);
        const safeProps = cleanedProps && Object.keys(cleanedProps).length > 0
            ? JSON.stringify({ page, section, element, ...cleanedProps })
            : JSON.stringify({ page, section, element });

        if (safeProps.length > PROPS_MAX_CHARS) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Payload limits exceeded`);
        }

        // Identity
        let anonId = request.cookies.get('condstore_anon')?.value;
        let isNewAnonId = false;

        if (!anonId) {
            anonId = crypto.randomUUID();
            isNewAnonId = true;
        }

        const userAgent = request.headers.get('user-agent') || undefined;
        const attrCookie = request.cookies.get('condstore_attr')?.value?.trim() || null;
        let attribution: AttributionSnapshot | null = null;

        if (attrCookie) {
            const click = await attributionClickRepository.getByToken(attrCookie);
            if (click) {
                attribution = normalizeAttributionSnapshot({
                    utmSource: click.utmSource,
                    utmMedium: click.utmMedium,
                    utmCampaign: click.utmCampaign,
                    utmTerm: click.utmTerm,
                    utmContent: click.utmContent,
                    refToken: click.token,
                    clickId: click.clickId,
                });
                attribution = sanitizeAttributionUtmFields(attribution);
            }
        }

        await analyticsService.logEvent({
            tenantId,
            anonId,
            event: type,
            path: page,
            props: JSON.parse(safeProps),
            userAgent,
            attribution,
        });

        const response = NextResponse.json({ ok: true });

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
        structuredLogger.error('public_events_api_unhandled', {
            requestId,
            tenantId,
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
