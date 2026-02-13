/**
 * Redis-backed rate limiter.
 * Tracks request counts per identifier (phone number or IP) using Redis INCR + EXPIRE.
 * Serverless-compatible — uses Upstash REST API.
 */

import { redisClient } from './redis.client';
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
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const limit = MAX_REQUESTS_PER_MINUTE;

    try {
        if (!redisClient.isAvailable()) {
            logger.warn('Rate limiter: Redis unavailable, allowing request', { identifier });
            return { allowed: true, remaining: limit, limit };
        }

        // Use Redis GET + SET pattern via the existing client
        const currentRaw = await redisClient.get<number>(key);
        const current = currentRaw ?? 0;

        if (current >= limit) {
            const ttl = await redisClient.ttl(key);
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
                retryAfterSeconds: ttl ?? WINDOW_SECONDS,
            };
        }

        // Increment counter
        await redisClient.set(key, current + 1, WINDOW_SECONDS);

        return {
            allowed: true,
            remaining: limit - (current + 1),
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
