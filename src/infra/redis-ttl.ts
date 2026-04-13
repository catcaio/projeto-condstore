/**
 * Centralized TTL constants for Redis operations.
 *
 * All redis.set() and redis.setNx() call sites must use explicit TTLs.
 * Never use 0 or undefined — use redis.del() for cache invalidation instead.
 */

/** Short-lived API/query cache: 5 minutes */
export const CACHE_TTL_SHORT = 300;

/** Distributed operation lock: 2 minutes */
export const LOCK_TTL = 120;

/**
 * Frank model override: 24 hours.
 * Overrides are admin-managed; TTL prevents orphaned keys if explicit
 * clear is never called (e.g. after a failed rollback recovery).
 */
export const FRANK_OVERRIDE_TTL = 86400;
