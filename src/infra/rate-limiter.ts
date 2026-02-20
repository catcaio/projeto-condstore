/**
 * Redis-backed rate limiter.
 * Tracks request counts per identifier (phone number or IP) using Redis INCR + EXPIRE.
 * Serverless-compatible — uses Upstash REST API.
 */

import { getRedis } from './redis.client';
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
 * Uses Redis INCR with TTL to track request counts.
 * If Redis is unavailable, allows the request (graceful degradation — don't block users).
 */
/**
 * Check rate limit for a given identifier.
 * Uses atomic Redis INCR + EXPIRE.
 * 
 * @param identifier Unique key (e.g. "webhook:tenant:phone" or "login:ip:email")
 * @param limit Max requests per window (default 10)
 * @param windowSeconds Window duration in seconds (default 60)
 */
export async function checkRateLimit(identifier: string, limit: number = MAX_REQUESTS_PER_MINUTE, windowSeconds: number = WINDOW_SECONDS): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;

    try {
        if (!getRedis().isAvailable()) {
            logger.warn('Rate limiter: Redis unavailable, allowing request', { identifier });
            return { allowed: true, remaining: limit, limit };
        }

        // Atomic increment
        const current = await getRedis().incr(key);

        if (current === null) {
            // Fallback if INCR fails
            return { allowed: true, remaining: limit, limit };
        }

        // If this is the first request, set expiration
        if (current === 1) {
            await getRedis().expire(key, windowSeconds);
        }

        if (current > limit) {
            const ttl = await getRedis().ttl(key);
            logger.warn('Rate limit exceeded', {
                event: 'RATE_LIMIT_EXCEEDED',
                identifier,
                current,
                limit,
                ttlSeconds: ttl,
            });
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfterSeconds: ttl ?? windowSeconds,
            };
        }

        return {
            allowed: true,
            remaining: Math.max(0, limit - current),
            limit,
        };
    } catch (error) {
        // On error, allow the request (don't block users due to rate limiter failures)
        logger.error('Rate limiter error, allowing request', error as Error, { identifier });
        return { allowed: true, remaining: limit, limit };
    }
}

/**
 * Generate a friendly throttling message for WhatsApp users.
 */
export function getThrottleMessage(): string {
    return 'Você está enviando muitas mensagens. Por favor, aguarde um momento antes de tentar novamente.';
}

