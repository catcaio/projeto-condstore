import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withDistributedLock } from '../lib/infra/distributed-lock';
import { LockAcquisitionError } from '../lib/infra/errors';

const mockRedis = vi.hoisted(() => ({
    setNx: vi.fn(),
    eval: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));

vi.mock('../infra/redis.client', () => ({
    redisClient: mockRedis,
}));

vi.mock('../infra/log/logger', () => ({
    structuredLogger: mockLogger,
}));

describe('withDistributedLock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('executes handler and releases lock when acquired successfully', async () => {
        mockRedis.setNx.mockResolvedValueOnce(true);
        mockRedis.eval.mockResolvedValueOnce(1); // successfully released

        const handler = vi.fn().mockResolvedValue('success');

        const result = await withDistributedLock('test-key', 10, handler);

        expect(result).toBe('success');
        expect(handler).toHaveBeenCalledTimes(1);
        expect(mockRedis.setNx).toHaveBeenCalledWith('lock:test-key', expect.any(String), 10);
        expect(mockRedis.eval).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('lock_acquired', expect.any(Object));
        expect(mockLogger.info).toHaveBeenCalledWith('lock_released', expect.any(Object));
    });

    it('throws LockAcquisitionError when lock fails to acquire', async () => {
        mockRedis.setNx.mockResolvedValueOnce(false); // another process holds the lock

        const handler = vi.fn();

        await expect(withDistributedLock('test-key', 10, handler))
            .rejects.toThrow(LockAcquisitionError);

        expect(handler).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith('lock_failed', expect.any(Object));
    });

    it('releases lock even if handler throws an error', async () => {
        mockRedis.setNx.mockResolvedValueOnce(true);
        mockRedis.eval.mockResolvedValueOnce(1); // successfully released

        const handler = vi.fn().mockRejectedValue(new Error('handler failed'));

        await expect(withDistributedLock('test-key', 10, handler))
            .rejects.toThrow('handler failed');

        expect(mockRedis.eval).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('lock_released', expect.any(Object));
    });

    it('logs a warning when lock release fails due to mismatch (expired/overwritten)', async () => {
        mockRedis.setNx.mockResolvedValueOnce(true);
        mockRedis.eval.mockResolvedValueOnce(0); // released 0 keys

        const handler = vi.fn().mockResolvedValue('success');

        await withDistributedLock('test-key', 10, handler);

        expect(mockLogger.warn).toHaveBeenCalledWith('lock_release_mismatch', expect.any(Object));
    });

    it('prevents concurrent executions and ensures only one runs', async () => {
        // We simulate a race condition where the first call gets the lock, the second doesn't.
        mockRedis.setNx
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const handler1 = vi.fn().mockResolvedValue('success1');
        const handler2 = vi.fn().mockResolvedValue('success2');

        const p1 = withDistributedLock('test-key', 10, handler1);
        const p2 = withDistributedLock('test-key', 10, handler2);

        const [res1, res2] = await Promise.allSettled([p1, p2]);

        expect(res1.status).toBe('fulfilled');
        expect(res2.status).toBe('rejected');
        expect(handler1).toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });
});
