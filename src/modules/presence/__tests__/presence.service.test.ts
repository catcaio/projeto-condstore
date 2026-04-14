/**
 * Tests for presence.service.ts
 *
 * Covers:
 * - operator online returns true
 * - operator offline returns false
 * - TTL semantics (in-memory expiry)
 * - tenant isolation (no cross-tenant leakage)
 * - Redis failure fail-safe (returns false)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock redisClient before importing the service ───────────────────────────

const mockRedis = vi.hoisted(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: mockRedis,
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
    setOperatorOnline,
    setOperatorOffline,
    isOperatorOnline,
    PRESENCE_TTL_SECONDS,
} from '../presence.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PresenceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('PRESENCE_TTL_SECONDS', () => {
        it('should be 90 seconds', () => {
            expect(PRESENCE_TTL_SECONDS).toBe(90);
        });
    });

    describe('setOperatorOnline', () => {
        it('should call redis.set with correct key, value and TTL', async () => {
            mockRedis.set.mockResolvedValueOnce(undefined);

            await setOperatorOnline('tenant-abc');

            expect(mockRedis.set).toHaveBeenCalledWith(
                'presence:operator:tenant-abc',
                1,
                PRESENCE_TTL_SECONDS,
            );
        });

        it('should not throw when redis.set fails (fail-safe)', async () => {
            mockRedis.set.mockRejectedValueOnce(new Error('Redis down'));

            await expect(setOperatorOnline('tenant-abc')).resolves.not.toThrow();
        });

        it('should use separate keys per tenant (isolation)', async () => {
            mockRedis.set.mockResolvedValue(undefined);

            await setOperatorOnline('tenant-1');
            await setOperatorOnline('tenant-2');

            const calls = mockRedis.set.mock.calls.map((c) => c[0] as string);
            expect(calls[0]).toBe('presence:operator:tenant-1');
            expect(calls[1]).toBe('presence:operator:tenant-2');
        });
    });

    describe('setOperatorOffline', () => {
        it('should call redis.del with correct key', async () => {
            mockRedis.del.mockResolvedValueOnce(undefined);

            await setOperatorOffline('tenant-abc');

            expect(mockRedis.del).toHaveBeenCalledWith('presence:operator:tenant-abc');
        });

        it('should not throw when redis.del fails (fail-safe)', async () => {
            mockRedis.del.mockRejectedValueOnce(new Error('Redis down'));

            await expect(setOperatorOffline('tenant-abc')).resolves.not.toThrow();
        });
    });

    describe('isOperatorOnline', () => {
        it('should return true when redis key has value 1 (operator online)', async () => {
            mockRedis.get.mockResolvedValueOnce(1);

            const result = await isOperatorOnline('tenant-abc');

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith('presence:operator:tenant-abc');
        });

        it('should return false when redis key is null (key absent / TTL expired)', async () => {
            mockRedis.get.mockResolvedValueOnce(null);

            const result = await isOperatorOnline('tenant-abc');

            expect(result).toBe(false);
        });

        it('should return false when redis throws (fail-safe default)', async () => {
            mockRedis.get.mockRejectedValueOnce(new Error('Redis unavailable'));

            const result = await isOperatorOnline('tenant-abc');

            expect(result).toBe(false);
        });

        describe('tenant isolation', () => {
            it('should return true for online tenant and false for offline tenant independently', async () => {
                // tenant-1 is online, tenant-2 is offline
                mockRedis.get
                    .mockImplementation(async (key: string) => {
                        if (key === 'presence:operator:tenant-1') return 1;
                        if (key === 'presence:operator:tenant-2') return null;
                        return null;
                    });

                const [t1, t2] = await Promise.all([
                    isOperatorOnline('tenant-1'),
                    isOperatorOnline('tenant-2'),
                ]);

                expect(t1).toBe(true);
                expect(t2).toBe(false);
            });

            it('should query separate keys for each tenant', async () => {
                mockRedis.get.mockResolvedValue(null);

                await isOperatorOnline('tenant-alpha');
                await isOperatorOnline('tenant-beta');

                const keys = mockRedis.get.mock.calls.map((c) => c[0] as string);
                expect(keys).toContain('presence:operator:tenant-alpha');
                expect(keys).toContain('presence:operator:tenant-beta');
                expect(keys[0]).not.toBe(keys[1]);
            });
        });
    });

    describe('heartbeat flow (set → check → expire → check)', () => {
        it('should correctly simulate online → TTL expiry → offline lifecycle', async () => {
            // Step 1: operator goes online
            mockRedis.set.mockResolvedValueOnce(undefined);
            await setOperatorOnline('tenant-abc');
            expect(mockRedis.set).toHaveBeenCalledWith('presence:operator:tenant-abc', 1, 90);

            // Step 2: check while online
            mockRedis.get.mockResolvedValueOnce(1);
            expect(await isOperatorOnline('tenant-abc')).toBe(true);

            // Step 3: TTL expires (Redis returns null)
            mockRedis.get.mockResolvedValueOnce(null);
            expect(await isOperatorOnline('tenant-abc')).toBe(false);
        });

        it('should correctly simulate online → explicit offline', async () => {
            mockRedis.set.mockResolvedValueOnce(undefined);
            await setOperatorOnline('tenant-abc');

            mockRedis.del.mockResolvedValueOnce(undefined);
            await setOperatorOffline('tenant-abc');
            expect(mockRedis.del).toHaveBeenCalledWith('presence:operator:tenant-abc');

            mockRedis.get.mockResolvedValueOnce(null);
            expect(await isOperatorOnline('tenant-abc')).toBe(false);
        });
    });
});
