import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { z } from 'zod';
import { requireSession } from '../../../infra/auth/guards';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '../../../infra/http/request-trace';
import { attributionClickRepository } from '../../../infra/repositories/attribution-click.repository';
import { normalizeAttributionSnapshot } from '../../../infra/attribution/attribution.types';
import type { AttributionSnapshot } from '../../../infra/attribution/attribution.types';
import { sha256Hex } from '../../../infra/attribution/hash';
import { ErrorCode, errorResponse } from '../../../infra/http/error-response';
import { structuredLogger } from '../../../infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '../../../infra/security/rate-limiter';

const BODY_MAX_BYTES = 8 * 1024;
const PROPS_MAX_CHARS = 4096;
const UTM_MAX_LENGTH = 128;

function isAllowedEventType(value: string): boolean {
    const normalized = value.trim();
    if (!normalized) return false;

    return (
        normalized === 'RATE_LIMITED' ||
        /^(landing|pricing|checkout|cta|whatsapp|quote|funnel)_[a-z0-9_]+$/i.test(normalized)
    );
}

const eventSchema = z.object({
    event: z.string().min(1).max(64).refine(isAllowedEventType, 'Unsupported event type'),
    path: z.string().min(1).max(200),
    props: z.record(z.string(), z.any()).optional(),
}).strict();

function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || null;
    }
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

async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const route = '/api/events';
    const startedAt = Date.now();
    let tenantId: string | undefined;

    try {
        const attrCookie = request.cookies.get('condstore_attr')?.value?.trim() || null;
        const ipHash = sha256Hex(getClientIp(request)) ?? 'ip_unknown';
        const rateLimitKey = attrCookie
            ? `attr:${sha256Hex(attrCookie) ?? 'attr_unknown'}`
            : `ip:${ipHash}`;
        const rateDecision = await rateLimiter.limit('events', rateLimitKey, {
            windowSec: 60,
            max: 60,
        });

        if (!rateDecision.allowed) {
            structuredLogger.warn('rate_limited', {
                requestId,
                route,
                tenantId,
                eventType: 'RATE_LIMITED',
                scope: 'events',
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
        try {
            bodyObj = JSON.parse(rawBody);
        } catch {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON payload');
        }

        const sessionResult = await requireSession(request, { requestId });
        if (!sessionResult.ok) {
            return sessionResult.response;
        }
        tenantId = sessionResult.session.tenantId;

        const parseResult = eventSchema.safeParse(bodyObj);

        if (!parseResult.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload schema');
        }

        const { event, path, props } = parseResult.data;

        // 🔒 Validate 4KB limits strictly to avoid payload bloat
        const safeProps =
            props && Object.keys(props).length > 0
                ? JSON.stringify(props)
                : null;

        if (safeProps && safeProps.length > PROPS_MAX_CHARS) {
            // Keep props limit stricter than body limit to cap DB payload size.
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Payload limits exceeded (Max ${PROPS_MAX_CHARS} chars)`);
        }

        // 🔒 Anonymous Identity Management (Strict crypto.randomUUID implementation constraint)
        let anonId = request.cookies.get('condstore_anon')?.value;
        let isNewAnonId = false;

        if (!anonId) {
            anonId = crypto.randomUUID();
            isNewAnonId = true;
        }

        const userAgent = request.headers.get('user-agent') || undefined;
        const attrToken = attrCookie;
        let attribution: AttributionSnapshot | null = null;

        if (attrToken) {
            const click = await attributionClickRepository.getByToken(attrToken);
            if (click && (!click.tenantId || click.tenantId === tenantId)) {
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

        // Async fire-and-forget logic (Resilient - won't throw out to surface)
        await analyticsService.logEvent({
            tenantId,
            anonId,
            event,
            path,
            props: props ?? null,
            userAgent,
            attribution,
        });

        const response = NextResponse.json({ ok: true });

        if (isNewAnonId) {
            response.cookies.set('condstore_anon', anonId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 180, // 180 Days
                path: '/',
            });
        }

        return response;

    } catch (err) {
        structuredLogger.error('events_api_unhandled', {
            requestId,
            tenantId,
            route,
            eventType: 'route_error',
            durationMs: Date.now() - startedAt,
            errorCode: ErrorCode.UNKNOWN,
            error: err,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Ingest Error');
    }
}

export const POST = withRequestTrace(handler);
