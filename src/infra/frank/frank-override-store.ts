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

export interface OverrideListRecord {
  tenantId: string;
  candidateVersionId: string;
  baselineVersionId?: string;
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

/**
 * List all tenant overrides from Redis.
 * Returns empty array if Redis is unavailable or listing fails.
 */
export async function listOverrides(): Promise<OverrideListRecord[]> {
  try {
    const keys = await redisClient.keys(`${OVERRIDE_KEY_PREFIX}*`);
    if (!keys || keys.length === 0) return [];

    const records = await Promise.all(keys.map(async (key) => {
      const tenantId = key.startsWith(OVERRIDE_KEY_PREFIX) ? key.slice(OVERRIDE_KEY_PREFIX.length) : '';
      if (!tenantId) return null;
      const candidateVersionId = await getTenantOverride(tenantId);
      if (!candidateVersionId) return null;
      return { tenantId, candidateVersionId } satisfies OverrideListRecord;
    }));

    return records.filter(Boolean) as OverrideListRecord[];
  } catch (error) {
    logger.warn('frank_override_store_list_failed', { error: String(error) });
    return [];
  }
}
