import { randomUUID } from 'crypto';
import { redisClient } from '../../infra/redis.client';
import { structuredLogger } from '../../infra/log/logger';
import { LockAcquisitionError } from './errors';

const LUA_RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Executes a handler with a distributed lock.
 * Ensures that the block of code does not run concurrently for the same key.
 *
 * @param key The unique key to lock on (use helpers from lock-keys.ts)
 * @param ttlSeconds The time-to-live for the lock to prevent deadlocks (in seconds)
 * @param handler The asynchronous function to execute
 */
export async function withDistributedLock<T>(
    key: string,
    ttlSeconds: number,
    handler: () => Promise<T>
): Promise<T> {
    const lockKey = `lock:${key}`;
    const token = randomUUID();

    let acquired = false;
    try {
        acquired = await redisClient.setNx(lockKey, token, ttlSeconds);
    } catch (error) {
        structuredLogger.error('distributed_lock_redis_error', { lockKey, error });
        throw new LockAcquisitionError(key);
    }

    if (!acquired) {
        structuredLogger.warn('lock_failed', { lockKey, eventType: 'lock_failed' });
        throw new LockAcquisitionError(key);
    }

    structuredLogger.info('lock_acquired', { lockKey, eventType: 'lock_acquired' });

    try {
        return await handler();
    } finally {
        try {
            // Only release the lock if the token matches, preventing releasing another execution's lock
            const serializedToken = JSON.stringify(token);
            const result = await redisClient.eval(LUA_RELEASE_SCRIPT, 1, lockKey, serializedToken);

            if (result === 1) {
                structuredLogger.info('lock_released', { lockKey, eventType: 'lock_released' });
            } else {
                structuredLogger.warn('lock_release_mismatch', {
                    lockKey,
                    eventType: 'lock_released',
                    message: 'Lock expired or overwritten before release'
                });
            }
        } catch (error) {
            structuredLogger.error('distributed_lock_release_error', { lockKey, error });
        }
    }
}
