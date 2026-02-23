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

    // ── L1: Redis ──────────────────────────────────────────────────────────────
    try {
        const cached = await redisClient.get<ContextMessage[]>(key);
        if (cached !== null) {
            // Snapshot may hold more than `limit` entries if MAX changed; trim.
            return cached.slice(-limit);
        }
    } catch (err) {
        logger.error('context-cache: Redis GET failed, falling back to DB', err as Error, { tenantId });
    }

    // ── L2: DB fallback ────────────────────────────────────────────────────────
    try {
        const msgs = await messageRepository.getLastMessages(tenantId, phoneNumber, limit);

        // Re-warm the cache (best-effort — don't let a Redis error block the caller)
        try {
            await redisClient.set(key, msgs, CONTEXT_TTL_SECONDS);
        } catch (cacheErr) {
            logger.error('context-cache: Redis SET failed after DB fallback', cacheErr as Error, { tenantId });
        }

        return msgs;
    } catch (err) {
        logger.error('context-cache: DB fallback failed', err as Error, { tenantId });
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
    } catch (err) {
        // Non-fatal: a stale/missing cache entry is recovered on the next getContext call.
        logger.error('context-cache: appendMessage failed', err as Error, { tenantId });
    }
}
