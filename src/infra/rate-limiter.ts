/**
 * Redis-backed rate limiter — atomic, fail-closed, PII-safe.
 *
 * Strategy: SET key 0 NX EX <window> + INCR key in a single pipeline round-trip.
 *   - SET NX EX guarantees the TTL is always set atomically on first creation.
 *   - INCR is atomic in Redis; no race condition can leave a key without a TTL.
 *   - All three commands (SET NX EX, INCR, TTL) execute in one HTTP round-trip.
 *
 * Fail-closed: any Redis error (unavailable, timeout, unexpected response)
 * returns allowed: false with a 429-ready result. Never fail-open.
 *
 * Log safety: identifier is hashed with SHA-256; only the first 12 hex chars
 * are logged — enough for correlation, impossible to reverse to email/IP/phone.
 */

import { redisClient } from './redis.client';
import { logger } from './logger';

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    retryAfterSeconds?: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SECONDS = 60;

// ---------------------------------------------------------------------------
// Identifier hashing
// ---------------------------------------------------------------------------

/**
 * Hash an identifier with SHA-256 (Web Crypto API — works in Node.js + Edge).
 * Returns the first 12 hex characters: enough for log correlation, not reversible.
 */
async function hashIdentifier(identifier: string): Promise<string> {
    const data = new TextEncoder().encode(identifier);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Fail-closed sentinel result
// ---------------------------------------------------------------------------

function deniedResult(limit: number, retryAfterSeconds: number): RateLimitResult {
    return { allowed: false, remaining: 0, limit, retryAfterSeconds };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given identifier.
 *
 * Uses an atomic pipeline:
 *   1. SET ratelimit:<identifier> 0 NX EX <window>  — create with TTL only if absent
 *   2. INCR ratelimit:<identifier>                   — atomic counter increment
 *   3. TTL  ratelimit:<identifier>                   — remaining window (for Retry-After)
 *
 * @param identifier Unique key — e.g. "webhook:tenantId:fromNormalized" or
 *                   "login:ip:email". NEVER logged raw; hashed before logging.
 * @param limit      Max requests allowed per window (default 10).
 * @param windowSeconds Duration of the sliding window in seconds (default 60).
 */
export async function checkRateLimit(
    identifier: string,
    limit: number = DEFAULT_LIMIT,
    windowSeconds: number = DEFAULT_WINDOW_SECONDS,
): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;

    // Hash the identifier BEFORE any I/O so it's ready for all log calls.
    const identifierHash = await hashIdentifier(identifier);

    try {
        // Single round-trip: SET NX EX + INCR + TTL (pipeline, not multi/exec).
        // SET NX EX is atomic — TTL is guaranteed to exist after this command.
        // INCR on an existing key with TTL preserves the TTL (Redis semantics).
        const results = await redisClient.pipeline([
            ['SET', key, '0', 'NX', 'EX', String(windowSeconds)],
            ['INCR', key],
            ['TTL', key],
        ]);

        // results[0] = SET NX result ("OK" | null) — not needed for logic
        const current = results[1]?.result;
        const ttlSeconds = results[2]?.result;

        // Guard against unexpected Redis response shapes — fail closed.
        if (typeof current !== 'number') {
            logger.error('Rate limiter: unexpected INCR result, denying (fail-closed)', undefined, {
                identifierHash,
                current,
            });
            return deniedResult(limit, windowSeconds);
        }

        const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : windowSeconds;

        if (current > limit) {
            logger.warn('Rate limit exceeded', {
                event: 'RATE_LIMIT_EXCEEDED',
                identifierHash,
                current,
                limit,
                ttlSeconds: ttl,
            });
            return deniedResult(limit, ttl);
        }

        return {
            allowed: true,
            remaining: Math.max(0, limit - current),
            limit,
        };
    } catch (error) {
        // Fail-closed: Redis unavailable, timeout, or unexpected error.
        // Deny the request rather than bypass rate limiting entirely.
        logger.error(
            'Rate limiter error — denying request (fail-closed)',
            error as Error,
            { identifierHash },
        );
        return deniedResult(limit, windowSeconds);
    }
}

/**
 * Generate a friendly throttling message for WhatsApp users.
 */
export function getThrottleMessage(): string {
    return 'Você está enviando muitas mensagens. Por favor, aguarde um momento antes de tentar novamente.';
}
