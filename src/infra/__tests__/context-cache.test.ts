import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextMessage } from '../context-cache';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRedis = vi.hoisted(() => ({
    get: vi.fn<[], Promise<ContextMessage[] | null>>().mockResolvedValue(null),
    set: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
}));

const mockMessageRepo = vi.hoisted(() => ({
    getLastMessages: vi.fn<[], Promise<ContextMessage[]>>().mockResolvedValue([]),
}));

const mockLogger = vi.hoisted(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
}));

const mockMetrics = vi.hoisted(() => ({
    increment: vi.fn(),
}));

vi.mock('../redis.client', () => ({
    redisClient: mockRedis,
}));

vi.mock('../repositories/message.repository', () => ({
    messageRepository: mockMessageRepo,
}));

vi.mock('../logger', () => ({
    logger: mockLogger,
}));

vi.mock('../../modules/metrics/metrics', () => ({
    metrics: mockMetrics,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function msg(
    body: string,
    direction: 'inbound' | 'outbound' = 'inbound',
    intentConfidence: number | null = 0.9,
): ContextMessage {
    return { body, direction, intent: 'FREIGHT_QUERY', intentConfidence, createdAt: new Date().toISOString() };
}

// ── Import AFTER mocks are registered ─────────────────────────────────────────

const { getContext, appendMessage, buildContextKey } = await import('../context-cache');

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('getContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.NODE_ENV;
    });

    it('returns cached messages on cache HIT (does not call DB)', async () => {
        const cached = [msg('cached msg')];
        mockRedis.get.mockResolvedValueOnce(cached);

        const result = await getContext('t1', 'hash-1', '+5511', 5);

        expect(result).toEqual(cached);
        expect(mockMessageRepo.getLastMessages).not.toHaveBeenCalled();
        expect(mockMetrics.increment).toHaveBeenCalledTimes(1);
        expect(mockMetrics.increment).toHaveBeenCalledWith('context_cache_hit', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'hit',
        });
    });

    it('returns at most `limit` messages from cache', async () => {
        const cached = [msg('a'), msg('b'), msg('c'), msg('d'), msg('e'), msg('f')];
        mockRedis.get.mockResolvedValueOnce(cached);

        const result = await getContext('t1', 'hash-1', '+5511', 3);

        expect(result).toHaveLength(3);
        // slice(-3) returns the 3 most recent
        expect(result[0].body).toBe('d');
        expect(result[2].body).toBe('f');
    });

    it('falls back to DB on cache MISS and re-warms Redis', async () => {
        mockRedis.get.mockResolvedValueOnce(null); // cache miss
        const dbMsgs = [msg('db msg')];
        mockMessageRepo.getLastMessages.mockResolvedValueOnce(dbMsgs);

        const result = await getContext('t1', 'hash-1', '+5511', 5);

        expect(mockMessageRepo.getLastMessages).toHaveBeenCalledWith('t1', '+5511', 5);
        expect(mockRedis.set).toHaveBeenCalledWith(
            buildContextKey({ tenantId: 't1', phoneHash: 'hash-1' }),
            dbMsgs,
            expect.any(Number),
        );
        expect(result).toEqual(dbMsgs);
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(1, 'context_cache_miss', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'miss',
        });
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(2, 'context_cache_db_fallback_ok', {
            tenantId: 't1',
            limit: 5,
            source: 'db',
            reason: 'miss',
        });
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(3, 'context_cache_rewarm_ok', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'miss',
        });
    });

    it('returns empty array when both Redis and DB fail', async () => {
        mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));
        mockMessageRepo.getLastMessages.mockRejectedValueOnce(new Error('DB down'));

        const result = await getContext('t1', 'hash-1', '+5511', 5);

        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('enforces tenant isolation — key includes tenantId', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockMessageRepo.getLastMessages.mockResolvedValue([]);

        await getContext('tenant-A', 'same-hash', '+5511', 5);
        await getContext('tenant-B', 'same-hash', '+5511', 5);

        const calls = mockRedis.get.mock.calls.map(c => c[0] as string);
        expect(calls[0]).toBe(buildContextKey({ tenantId: 'tenant-A', phoneHash: 'same-hash' }));
        expect(calls[1]).toBe(buildContextKey({ tenantId: 'tenant-B', phoneHash: 'same-hash' }));
        // DB was called once per tenant with their specific tenantId
        expect(mockMessageRepo.getLastMessages.mock.calls[0][0]).toBe('tenant-A');
        expect(mockMessageRepo.getLastMessages.mock.calls[1][0]).toBe('tenant-B');
    });

    it('proceeds (empty) when Redis SET fails after DB fallback', async () => {
        mockRedis.get.mockResolvedValueOnce(null);
        mockMessageRepo.getLastMessages.mockResolvedValueOnce([msg('x')]);
        mockRedis.set.mockRejectedValueOnce(new Error('Redis write fail'));

        const result = await getContext('t1', 'hash-1', '+5511', 5);

        // Result still comes from DB even though cache write failed
        expect(result).toHaveLength(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(1, 'context_cache_miss', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'miss',
        });
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(2, 'context_cache_db_fallback_ok', {
            tenantId: 't1',
            limit: 5,
            source: 'db',
            reason: 'miss',
        });
        expect(mockMetrics.increment).toHaveBeenNthCalledWith(3, 'context_cache_rewarm_fail', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'redis_error',
        });
    });
});

describe('appendMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('appends a message to an empty cache entry', async () => {
        mockRedis.get.mockResolvedValueOnce(null);
        const m = msg('hello');

        await appendMessage('t1', 'hash-1', m);

        expect(mockRedis.set).toHaveBeenCalledWith(
            buildContextKey({ tenantId: 't1', phoneHash: 'hash-1' }),
            [m],
            expect.any(Number),
        );
    });

    it('appends to existing messages and trims to MAX (5)', async () => {
        const existing = [msg('a'), msg('b'), msg('c'), msg('d'), msg('e')];
        mockRedis.get.mockResolvedValueOnce(existing);

        await appendMessage('t1', 'hash-1', msg('f'));

        const [, written] = mockRedis.set.mock.calls[0] as [string, ContextMessage[], number];
        expect(written).toHaveLength(5);
        // Oldest 'a' should have been dropped
        expect(written[0].body).toBe('b');
        expect(written[4].body).toBe('f');
    });

    it('does not throw when Redis fails (swallows error)', async () => {
        mockRedis.get.mockRejectedValueOnce(new Error('Redis exploded'));

        await expect(appendMessage('t1', 'hash-1', msg('x'))).resolves.toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockMetrics.increment).toHaveBeenCalledWith('context_cache_append_fail', {
            tenantId: 't1',
            limit: 5,
            source: 'redis',
            reason: 'redis_error',
        });
    });
});

describe('buildContextKey', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalEnv;
        }
    });

    it('isolates keys by environment', () => {
        process.env.NODE_ENV = 'dev';
        const devKey = buildContextKey({ tenantId: 't1', phoneHash: 'h1' });
        process.env.NODE_ENV = 'prod';
        const prodKey = buildContextKey({ tenantId: 't1', phoneHash: 'h1' });

        expect(devKey).not.toBe(prodKey);
    });

    it('isolates keys by tenant', () => {
        process.env.NODE_ENV = 'dev';
        const keyA = buildContextKey({ tenantId: 'tenant-A', phoneHash: 'h1' });
        const keyB = buildContextKey({ tenantId: 'tenant-B', phoneHash: 'h1' });

        expect(keyA).not.toBe(keyB);
    });

    it('isolates keys by app name', () => {
        process.env.NODE_ENV = 'dev';
        const key = buildContextKey({ tenantId: 't1', phoneHash: 'h1' });
        const otherAppKey = `ctx:dev:other-app:t1:h1`;

        expect(key).not.toBe(otherAppKey);
    });
});
