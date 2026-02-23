/**
 * Conversation context cache — wraps Redis with a DB fallback.
 *
 * Key schema : ctx:{tenantId}:{phoneHash}
 * Value      : JSON array of ContextMessage (compact, serialisation-safe)
 * TTL        : CONTEXT_TTL_SECONDS (6 h by default)
 *
 * Why phoneHash in the key?  We never store raw phone numbers in Redis keys
 * to stay PII-safe.  The DB fallback path receives the normalised phone number
 * (fromPhone) so it can issue a real WHERE clause.
 *
 * Failure contract:
 *   - Redis failures are logged and swallowed; DB fallback is used.
 *   - DB failures return [] so the caller always gets a (possibly empty) array.
 *   - appendMessage failures are always swallowed (fire-and-forget callers).
 */

import { redisClient } from './redis.client';
import { messageRepository, type ContextMessage } from './repositories/message.repository';
import { logger } from './logger';
import { metrics } from '../modules/metrics/metrics';

export type { ContextMessage };

/** How long to keep a context snapshot in Redis (6 hours). */
const CONTEXT_TTL_SECONDS = 6 * 60 * 60; // 21 600 s

/** Maximum number of messages kept in a single context snapshot. */
const MAX_CONTEXT_MESSAGES = 5;

function cacheKey(tenantId: string, phoneHash: string): string {
    return `ctx:${tenantId}:${phoneHash}`;
}

/**
 * Get the last `limit` messages for a user, using Redis as L1 cache.
 *
 * On cache MISS the DB is queried via `messageRepository.getLastMessages`
 * and the result is written back to Redis (cache warm-up).
 *
 * @param tenantId    Tenant identifier — enforces cross-tenant isolation.
 * @param phoneHash   SHA-256 of the normalised phone number (for the Redis key).
 * @param phoneNumber Normalised phone number stored in `messages.from_phone`
 *                    (used only on cache miss for the DB fallback query).
 * @param limit       Number of messages to return (default: MAX_CONTEXT_MESSAGES).
 */
export async function getContext(
    tenantId: string,
    phoneHash: string,
    phoneNumber: string,
    limit: number = MAX_CONTEXT_MESSAGES,
): Promise<ContextMessage[]> {
    const key = cacheKey(tenantId, phoneHash);
    const metricTagsBase = { tenantId, limit, source: 'redis' as const };

    // ── L1: Redis ──────────────────────────────────────────────────────────────
    try {
        const cached = await redisClient.get<ContextMessage[]>(key);
        if (cached !== null) {
            metrics.increment('context_cache_hit', { ...metricTagsBase, reason: 'hit' });
            logger.debug('context-cache: cache hit', {
                tenantId,
                phoneHash,
                limit,
                source: 'redis',
                reason: 'hit',
            });
            // Snapshot may hold more than `limit` entries if MAX changed; trim.
            return cached.slice(-limit);
        }
        metrics.increment('context_cache_miss', { ...metricTagsBase, reason: 'miss' });
        logger.debug('context-cache: cache miss', {
            tenantId,
            phoneHash,
            limit,
            source: 'redis',
            reason: 'miss',
        });
    } catch (err) {
        metrics.increment('context_cache_miss', { ...metricTagsBase, reason: 'redis_error' });
        logger.error('context-cache: Redis GET failed, falling back to DB', err as Error, {
            tenantId,
            phoneHash,
            limit,
            source: 'redis',
            reason: 'redis_error',
        });
    }

    // ── L2: DB fallback ────────────────────────────────────────────────────────
    try {
        const msgs = await messageRepository.getLastMessages(tenantId, phoneNumber, limit);
        metrics.increment('context_cache_db_fallback_ok', {
            tenantId,
            limit,
            source: 'db',
            reason: 'miss',
        });
        logger.info('context-cache: DB fallback ok', {
            tenantId,
            phoneHash,
            limit,
            source: 'db',
            reason: 'miss',
        });

        // Re-warm the cache (best-effort — don't let a Redis error block the caller)
        try {
            await redisClient.set(key, msgs, CONTEXT_TTL_SECONDS);
            metrics.increment('context_cache_rewarm_ok', {
                tenantId,
                limit,
                source: 'redis',
                reason: 'miss',
            });
            logger.debug('context-cache: rewarm ok', {
                tenantId,
                phoneHash,
                limit,
                source: 'redis',
                reason: 'miss',
            });
        } catch (cacheErr) {
            metrics.increment('context_cache_rewarm_fail', {
                tenantId,
                limit,
                source: 'redis',
                reason: 'redis_error',
            });
            logger.error('context-cache: Redis SET failed after DB fallback', cacheErr as Error, {
                tenantId,
                phoneHash,
                limit,
                source: 'redis',
                reason: 'redis_error',
            });
        }

        return msgs;
    } catch (err) {
        metrics.increment('context_cache_db_fallback_fail', {
            tenantId,
            limit,
            source: 'db',
            reason: 'db_error',
        });
        logger.error('context-cache: DB fallback failed', err as Error, {
            tenantId,
            phoneHash,
            limit,
            source: 'db',
            reason: 'db_error',
        });
        return [];
    }
}

/**
 * Append a new message to the context snapshot in Redis.
 *
 * The snapshot is kept at most MAX_CONTEXT_MESSAGES entries (oldest entries
 * are dropped).  If Redis is unavailable the failure is swallowed — the next
 * `getContext` call will re-hydrate from the DB.
 *
 * This function is designed to be called as fire-and-forget (`void appendMessage(…)`).
 */
export async function appendMessage(
    tenantId: string,
    phoneHash: string,
    msg: ContextMessage,
): Promise<void> {
    const key = cacheKey(tenantId, phoneHash);

    try {
        const existing = (await redisClient.get<ContextMessage[]>(key)) ?? [];
        const updated = [...existing, msg].slice(-MAX_CONTEXT_MESSAGES);
        await redisClient.set(key, updated, CONTEXT_TTL_SECONDS);
        metrics.increment('context_cache_append_ok', {
            tenantId,
            limit: MAX_CONTEXT_MESSAGES,
            source: 'redis',
            reason: existing.length === 0 ? 'empty' : 'miss',
        });
        logger.debug('context-cache: append ok', {
            tenantId,
            phoneHash,
            limit: MAX_CONTEXT_MESSAGES,
            source: 'redis',
            reason: existing.length === 0 ? 'empty' : 'miss',
        });
    } catch (err) {
        metrics.increment('context_cache_append_fail', {
            tenantId,
            limit: MAX_CONTEXT_MESSAGES,
            source: 'redis',
            reason: 'redis_error',
        });
        // Non-fatal: a stale/missing cache entry is recovered on the next getContext call.
        logger.error('context-cache: appendMessage failed', err as Error, {
            tenantId,
            phoneHash,
            limit: MAX_CONTEXT_MESSAGES,
            source: 'redis',
            reason: 'redis_error',
        });
    }
}
