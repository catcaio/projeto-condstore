/**
 * @deprecated Prefer `rateLimiter.limit()` from `src/infra/security/rate-limiter`.
 * Legacy wrapper kept for compatibility while callers migrate.
 */

import { hashRateLimitKeyForLog, rateLimiter } from './security/rate-limiter';
import { logger } from './logger';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    retryAfterSeconds?: number;
}

const MAX_REQUESTS_PER_MINUTE = 10;
const WINDOW_SECONDS = 60;

/**
 * Check rate limit for a given identifier.
 *
 * @param identifier Unique key (e.g. "webhook:tenant:phone" or "login:ip:email")
 * @param limit Max requests per window (default 10)
 * @param windowSeconds Window duration in seconds (default 60)
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = MAX_REQUESTS_PER_MINUTE,
  windowSeconds: number = WINDOW_SECONDS,
): Promise<RateLimitResult> {
  const normalizedIdentifier = identifier.trim();
  const now = Date.now();

  const decision = await rateLimiter.limit('legacy', normalizedIdentifier, {
    max: limit,
    windowSec: windowSeconds,
  });

  if (!decision.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((decision.resetAt - now) / 1000));
    logger.warn('Rate limit exceeded', {
      event: 'RATE_LIMIT_EXCEEDED',
      identifierHash: hashRateLimitKeyForLog(normalizedIdentifier),
      limit,
      retryAfterSeconds,
    });
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: decision.remaining,
    limit,
  };
}

/**
 * Generate a friendly throttling message for WhatsApp users.
 */
export function getThrottleMessage(): string {
  return 'Você está enviando muitas mensagens. Por favor, aguarde um momento antes de tentar novamente.';
}

