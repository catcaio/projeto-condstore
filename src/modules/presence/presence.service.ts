/**
 * PresenceService
 *
 * Controls operator online/offline state per tenant using Redis.
 *
 * Strategy:
 * - Redis key: `presence:operator:{tenantId}`
 * - TTL: 90 seconds (renewed by cockpit heartbeat)
 * - Fail-safe: defaults to false (offline) when Redis is unavailable
 * - No database persistence — ephemeral presence only
 *
 * Isolation: each tenantId has its own key; no cross-tenant leakage.
 */

import { redisClient } from '@/infra/redis.client';
import { logger } from '@/infra/logger';
import { PRESENCE_OPERATOR_TTL } from '@/infra/redis-ttl';

/** Re-export TTL for test assertions and heartbeat callers. */
export const PRESENCE_TTL_SECONDS = PRESENCE_OPERATOR_TTL;

function presenceKey(tenantId: string): string {
    return `presence:operator:${tenantId}`;
}

/**
 * Mark operator as online for a tenant.
 * Resets the TTL to PRESENCE_TTL_SECONDS on every call (acts as heartbeat).
 */
export async function setOperatorOnline(tenantId: string): Promise<void> {
    const key = presenceKey(tenantId);
    try {
        await redisClient.set(key, 1, PRESENCE_TTL_SECONDS);
        logger.info('presence_operator_online', { tenantId });
    } catch (err) {
        // Fail silently — presence is best-effort; operator still works without it.
        logger.warn('presence_set_online_failed', { tenantId, error: (err as Error).message });
    }
}

/**
 * Mark operator as offline for a tenant.
 * Deletes the presence key immediately.
 */
export async function setOperatorOffline(tenantId: string): Promise<void> {
    const key = presenceKey(tenantId);
    try {
        await redisClient.del(key);
        logger.info('presence_operator_offline', { tenantId });
    } catch (err) {
        logger.warn('presence_set_offline_failed', { tenantId, error: (err as Error).message });
    }
}

/**
 * Check whether an operator is currently online for a tenant.
 *
 * Returns false (safe default) if Redis is unavailable or the key has expired.
 * This ensures Frank falls back to SUPERVISED mode gracefully on infrastructure issues.
 */
export async function isOperatorOnline(tenantId: string): Promise<boolean> {
    const key = presenceKey(tenantId);
    try {
        const value = await redisClient.get<number>(key);
        return value === 1;
    } catch (err) {
        // Fail-safe: treat Redis errors as "operator offline" to keep Frank supervised.
        logger.warn('presence_check_failed', { tenantId, error: (err as Error).message });
        return false;
    }
}

export const presenceService = {
    setOperatorOnline,
    setOperatorOffline,
    isOperatorOnline,
} as const;
