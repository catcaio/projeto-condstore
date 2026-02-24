/**
 * Frank Model Override Store
 *
 * Manages per-tenant Frank model version overrides via Redis.
 * Allows runtime rollback and override management without deployment.
 */

import { redisClient } from '@/infra/redis.client';
import { logger } from '@/infra/logger';

const OVERRIDE_KEY_PREFIX = 'frank:tenant:override:';

export interface OverrideRecord {
  tenantId: string;
  modelVersionId: string;
  reason?: string;
  appliedAt: string;
}

/**
 * Get the Redis key for a tenant's override.
 */
function getOverrideKey(tenantId: string): string {
  return `${OVERRIDE_KEY_PREFIX}${tenantId}`;
}

/**
 * Get the override for a specific tenant from Redis.
 * Returns null if not found or if Redis is unavailable.
 */
export async function getTenantOverride(tenantId: string): Promise<string | null> {
  try {
    const key = getOverrideKey(tenantId);
    const value = await redisClient.get<string>(key);
    return value;
  } catch (error) {
    logger.warn('frank_override_store_read_failed', { tenantId, error: String(error) });
    return null;
  }
}

/**
 * Set the override for a specific tenant in Redis.
 * Returns true if successful, false otherwise.
 */
export async function setTenantOverride(
  tenantId: string,
  modelVersionId: string | null,
  reason?: string,
): Promise<boolean> {
  try {
    const key = getOverrideKey(tenantId);

    if (modelVersionId === null) {
      // Delete the override
      await redisClient.del(key);
      logger.info('frank_override_cleared', {
        tenantId,
        reason: reason || 'manual',
      });
      return true;
    }

    // Set the override with metadata
    const record: OverrideRecord = {
      tenantId,
      modelVersionId,
      reason,
      appliedAt: new Date().toISOString(),
    };

    await redisClient.set(key, modelVersionId);
    logger.info('frank_override_set', {
      tenantId,
      modelVersionId,
      reason: reason || 'manual',
    });
    return true;
  } catch (error) {
    logger.error('frank_override_store_write_failed', error instanceof Error ? error : new Error(String(error)), {
      tenantId,
      modelVersionId,
    });
    return false;
  }
}

/**
 * Clear the override for a specific tenant.
 */
export async function clearTenantOverride(tenantId: string, reason?: string): Promise<boolean> {
  return setTenantOverride(tenantId, null, reason);
}
