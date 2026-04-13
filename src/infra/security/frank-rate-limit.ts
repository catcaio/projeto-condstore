import { rateLimiter, hashRateLimitKeyForLog, applyRateLimitHeaders } from './rate-limiter';
import { structuredLogger } from '../log/logger';
import { ErrorCode, errorResponse } from '../http/error-response';

const TENANT_WINDOW_SEC = 60;
const TENANT_MAX = 60;
const CONVERSATION_WINDOW_SEC = 60;
const CONVERSATION_MAX = 10;

type Blocked = { blocked: true; response: ReturnType<typeof errorResponse> };
type Allowed = { blocked: false };
export type FrankRateLimitResult = Blocked | Allowed;

/**
 * Two-level rate limiting for cockpit Frank routes (authenticated admin sessions).
 *
 * Level 1 — per tenant: 60 req / 60 s
 * Level 2 — per conversation (when conversationId is provided): 10 req / 60 s
 *
 * Fails closed on Redis failure (critical scope — not in FALLBACK_MEMORY_SCOPES).
 */
export async function applyFrankCockpitRateLimit(params: {
  tenantId: string;
  conversationId?: string;
  requestId: string;
  route: string;
}): Promise<FrankRateLimitResult> {
  const { tenantId, conversationId, requestId, route } = params;

  const tenantKey = `tenant:${tenantId}`;
  const tenantDecision = await rateLimiter.limit('frank_cockpit_tenant', tenantKey, {
    windowSec: TENANT_WINDOW_SEC,
    max: TENANT_MAX,
  });

  if (!tenantDecision.allowed) {
    structuredLogger.warn('frank_rate_limited', {
      tenantId,
      route,
      requestId,
      reason: 'tenant_limit_exceeded',
      keyHash: hashRateLimitKeyForLog(tenantKey),
    });
    const res = errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Too Many Requests');
    res.headers.set('Retry-After', String(Math.max(1, Math.ceil((tenantDecision.resetAt - Date.now()) / 1000))));
    applyRateLimitHeaders(res, tenantDecision);
    return { blocked: true, response: res };
  }

  if (conversationId) {
    const convKey = `tenant:${tenantId}:conversation:${conversationId}`;
    const convDecision = await rateLimiter.limit('frank_cockpit_conversation', convKey, {
      windowSec: CONVERSATION_WINDOW_SEC,
      max: CONVERSATION_MAX,
    });

    if (!convDecision.allowed) {
      structuredLogger.warn('frank_rate_limited', {
        tenantId,
        route,
        requestId,
        reason: 'conversation_limit_exceeded',
        keyHash: hashRateLimitKeyForLog(convKey),
      });
      const res = errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Too Many Requests');
      res.headers.set('Retry-After', String(Math.max(1, Math.ceil((convDecision.resetAt - Date.now()) / 1000))));
      applyRateLimitHeaders(res, convDecision);
      return { blocked: true, response: res };
    }
  }

  return { blocked: false };
}

/**
 * Single-level rate limiting for internal Frank routes (machine-to-machine, internal token).
 *
 * Per tenant: 60 req / 60 s
 * Fails closed on Redis failure.
 */
export async function applyFrankInternalRateLimit(params: {
  tenantId: string;
  requestId: string;
  route: string;
}): Promise<FrankRateLimitResult> {
  const { tenantId, requestId, route } = params;

  const rlKey = `tenant:${tenantId}`;
  const decision = await rateLimiter.limit('frank_internal_tenant', rlKey, {
    windowSec: 60,
    max: 60,
  });

  if (!decision.allowed) {
    structuredLogger.warn('frank_internal_rate_limited', {
      tenantId,
      route,
      requestId,
      reason: 'tenant_limit_exceeded',
      keyHash: hashRateLimitKeyForLog(rlKey),
    });
    const res = errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Too Many Requests');
    res.headers.set('Retry-After', String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))));
    applyRateLimitHeaders(res, decision);
    return { blocked: true, response: res };
  }

  return { blocked: false };
}

/**
 * Rate limiting for scheduler-style internal routes that process all tenants (no single tenantId).
 *
 * Global key: 10 req / 60 s (prevents scheduler abuse / runaway cron jobs).
 * Fails closed on Redis failure.
 */
export async function applyFrankSchedulerRateLimit(params: {
  requestId: string;
  route: string;
}): Promise<FrankRateLimitResult> {
  const { requestId, route } = params;

  const rlKey = 'global:frank_scheduler';
  const decision = await rateLimiter.limit('frank_internal_scheduler', rlKey, {
    windowSec: 60,
    max: 10,
  });

  if (!decision.allowed) {
    structuredLogger.warn('frank_internal_rate_limited', {
      route,
      requestId,
      reason: 'scheduler_limit_exceeded',
      keyHash: hashRateLimitKeyForLog(rlKey),
    });
    const res = errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Too Many Requests');
    res.headers.set('Retry-After', String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))));
    applyRateLimitHeaders(res, decision);
    return { blocked: true, response: res };
  }

  return { blocked: false };
}
