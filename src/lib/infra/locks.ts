import { acquireLock, releaseLock } from '../../infra/security/distributed-lock';
import { structuredLogger } from '../../infra/log/logger';

export class LockAcquisitionError extends Error {
    constructor(key: string) {
        super(`Failed to acquire distributed lock for key: ${key}`);
        this.name = 'LockAcquisitionError';
    }
}

export async function withDistributedLock<T>(
    key: string,
    ttlSec: number,
    handler: () => Promise<T>,
    requestId?: string
): Promise<T> {
    const { acquired, token } = await acquireLock(key, ttlSec);

    if (!acquired) {
        structuredLogger.warn('distributed_lock_acquisition_failed', {
            requestId,
            lockKey: key,
            eventType: 'lock_acquisition_failed',
        });
        throw new LockAcquisitionError(key);
    }

    try {
        return await handler();
    } finally {
        await releaseLock(key, token).catch((err) => {
            structuredLogger.error('distributed_lock_release_failed', {
                requestId,
                lockKey: key,
                error: err,
            });
        });
    }
}
