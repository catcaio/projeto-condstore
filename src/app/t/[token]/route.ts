import { NextRequest, NextResponse } from 'next/server';
import { attributionClickRepository } from '../../../infra/repositories/attribution-click.repository';
import { sha256Hex } from '../../../infra/attribution/hash';
import { attachRequestIdHeader, makeRequestId } from '../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../infra/http/error-response';
import { structuredLogger } from '../../../infra/log/logger';
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from '../../../infra/security/rate-limiter';

export const runtime = 'nodejs';

const ATTR_COOKIE = 'condstore_attr';
const UTM_MAX_LENGTH = 128;
const LANDING_URL_MAX_LENGTH = 2048;
const CLICK_ID_MAX_LENGTH = 255;
const TRACKING_RATE_LIMIT_MAX = 30;
const TRACKING_RATE_LIMIT_WINDOW_SEC = 60;

function parseToken(value: string | undefined): string | null {
  if (!value) return null;
  const token = value.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(token)) {
    return null;
  }
  return token;
}

function capString(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function pickClickId(searchParams: URLSearchParams): string | null {
  return capString(
    searchParams.get('gclid')?.trim() ||
    searchParams.get('fbclid')?.trim() ||
    searchParams.get('msclkid')?.trim() ||
    null,
    CLICK_ID_MAX_LENGTH,
  );
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return request.headers.get('x-real-ip');
}

function buildRedirectUrl(token: string): URL {
  const base = process.env.TRACKING_REDIRECT_URL;
  if (!base) {
    throw new Error('TRACKING_REDIRECT_URL is not configured');
  }

  const mode = (process.env.TRACKING_REDIRECT_MODE || 'landing').toLowerCase();
  const target = new URL(base);

  if (mode === 'whatsapp') {
    const existingText = target.searchParams.get('text')?.trim();
    const tokenText = `#t=${token}`;
    target.searchParams.set('text', existingText ? `${existingText} ${tokenText}` : tokenText);
    return target;
  }

  // landing/default mode
  target.searchParams.set('t', token);
  return target;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = makeRequestId(request);
  const route = '/t/[token]';

  const finalize = (response: NextResponse) => attachRequestIdHeader(response, requestId);

  try {
    const ipHash = sha256Hex(getClientIp(request)) ?? 'ip_unknown';
    const rateLimitKey = `ip:${ipHash}`;
    const decision = await rateLimiter.limit('tracking', rateLimitKey, {
      windowSec: TRACKING_RATE_LIMIT_WINDOW_SEC,
      max: TRACKING_RATE_LIMIT_MAX,
    });
    if (!decision.allowed) {
      structuredLogger.warn('rate_limited', {
        requestId,
        route,
        eventType: 'RATE_LIMITED',
        scope: 'tracking',
        keyHash: hashRateLimitKeyForLog(rateLimitKey),
        remaining: decision.remaining,
      });
      return finalize(
        applyRateLimitHeaders(
          errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
          decision,
        ),
      );
    }

    const params = await context.params;
    const token = parseToken(params?.token);

    if (!token) {
      return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'invalid_token'));
    }

    const searchParams = request.nextUrl.searchParams;
    const userAgent = request.headers.get('user-agent');
    const landingUrl = capString(searchParams.get('landing_url'), LANDING_URL_MAX_LENGTH);
    const existingToken = await attributionClickRepository.getByToken(token);

    if (existingToken) {
      await attributionClickRepository.upsertByToken({
        token,
        tenantId: capString(searchParams.get('tenant_id'), 36),
        utmSource: capString(searchParams.get('utm_source'), UTM_MAX_LENGTH),
        utmMedium: capString(searchParams.get('utm_medium'), UTM_MAX_LENGTH),
        utmCampaign: capString(searchParams.get('utm_campaign'), UTM_MAX_LENGTH),
        utmTerm: capString(searchParams.get('utm_term'), UTM_MAX_LENGTH),
        utmContent: capString(searchParams.get('utm_content'), UTM_MAX_LENGTH),
        clickId: pickClickId(searchParams),
        landingUrl,
        userAgentHash: sha256Hex(userAgent),
        ipHash,
      });
    } else {
      structuredLogger.info('tracking_token_not_found', {
        requestId,
        route,
        eventType: 'tracking_token_not_found',
        refHash: sha256Hex(token)?.slice(0, 16),
        ipHash: ipHash.slice(0, 16),
      });
    }

    const response = NextResponse.redirect(buildRedirectUrl(token), { status: 302 });
    response.cookies.set(ATTR_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return finalize(response);
  } catch (error) {
    structuredLogger.error('tracking_redirect_failed', {
      requestId,
      route,
      eventType: 'route_error',
      errorCode: ErrorCode.UNKNOWN,
      error,
    });
    return finalize(errorResponse(ErrorCode.UNKNOWN, 500, requestId, (error as Error).message || 'tracking_redirect_failed'));
  }
}
