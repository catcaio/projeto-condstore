import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageRepository } from '../message.repository';
import { redisClient } from '../../redis.client';

// ── DB mock (Drizzle chained query) ───────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../db', () => ({
    getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('../../logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('../../redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn().mockReturnValue(false),
        del: vi.fn().mockResolvedValue(undefined),
    },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRow(body: string, offsetMs: number, intentConfidence: string | null = '0.9000') {
    return {
        body,
        bodyEncrypted: null,
        direction: 'inbound',
        intent: 'FREIGHT_QUERY',
        intentConfidence,
        createdAt: new Date(1_700_000_000_000 + offsetMs),
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MessageRepository.getLastMessages', () => {
    let repo: MessageRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new MessageRepository();
        mockDb.values.mockResolvedValue(undefined);
        mockDb.limit.mockResolvedValue([]);
    });

    it('returns empty array for missing tenantId', async () => {
        const result = await repo.getLastMessages('', '+5511999999999', 5);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('returns empty array for missing phoneNumber', async () => {
        const result = await repo.getLastMessages('tenant-1', '', 5);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('returns empty array for limit <= 0', async () => {
        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 0);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('issues a single query and respects limit', async () => {
        const dbRows = [
            makeRow('msg C', 3000),
            makeRow('msg B', 2000),
            makeRow('msg A', 1000),
        ];
        mockDb.limit.mockResolvedValueOnce(dbRows);

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 3);

        expect(mockDb.select).toHaveBeenCalledTimes(1);
        expect(mockDb.limit).toHaveBeenCalledWith(3);
        expect(result).toHaveLength(3);
    });

    it('returns messages in chronological order (oldest first)', async () => {
        // DB returns DESC (newest first), repository must reverse
        const dbRows = [
            makeRow('newest', 3000),
            makeRow('middle', 2000),
            makeRow('oldest', 1000),
        ];
        mockDb.limit.mockResolvedValueOnce(dbRows);

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 3);

        expect(result[0].body).toBe('oldest');
        expect(result[1].body).toBe('middle');
        expect(result[2].body).toBe('newest');
    });

    it('enforces tenant isolation — uses tenantId in the query', async () => {
        mockDb.limit.mockResolvedValueOnce([]);

        await repo.getLastMessages('tenant-A', '+5511999999999', 5);

        expect(mockDb.where).toHaveBeenCalled();
    });

    it('returns intentConfidence as number when DB returns decimal string', async () => {
        mockDb.limit.mockResolvedValueOnce([makeRow('hi', 1000, '0.9500')]);

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 1);

        expect(result[0].intentConfidence).toBe(0.95);
        expect(typeof result[0].intentConfidence).toBe('number');
    });

    it('returns intentConfidence as null when DB returns null', async () => {
        mockDb.limit.mockResolvedValueOnce([makeRow('hi', 1000, null)]);

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 1);

        expect(result[0].intentConfidence).toBeNull();
    });

    it('converts Date objects to ISO strings', async () => {
        const ts = new Date('2024-01-15T10:00:00.000Z');
        mockDb.limit.mockResolvedValueOnce([{
            body: 'hi',
            bodyEncrypted: null,
            direction: 'inbound',
            intent: 'UNKNOWN',
            intentConfidence: null,
            createdAt: ts,
        }]);

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 1);

        expect(result[0].createdAt).toBe(ts.toISOString());
    });

    it('returns empty array (does not throw) when DB query fails', async () => {
        mockDb.limit.mockRejectedValueOnce(new Error('DB connection lost'));

        const result = await repo.getLastMessages('tenant-1', '+5511999999999', 5);

        expect(result).toEqual([]);
    });

    it('invalidates cockpit metrics cache after successful inbound insert', async () => {
        vi.mocked(redisClient.isAvailable).mockReturnValue(true);

        await repo.saveInboundMessage({
            messageSid: 'SM123',
            tenantId: 'tenant-1',
            fromPhone: '+5511999999999',
            toPhone: '+5511000000000',
            body: 'oi',
            rawPayload: '{}',
            direction: 'inbound',
            intent: 'unknown',
        });

        expect(redisClient.del).toHaveBeenCalledWith('cockpit:metrics:tenant-1');
    });

    it('dual-writes phone_hash/phone_encrypted/body_encrypted and redacts plaintext', async () => {
        await repo.saveInboundMessage({
            messageSid: 'SM456',
            tenantId: 'tenant-1',
            fromPhone: 'whatsapp:+5511999999999',
            toPhone: '+5511000000000',
            body: 'mensagem secreta',
            rawPayload: '{}',
            direction: 'inbound',
            intent: 'unknown',
        });

        const inserted = mockDb.values.mock.calls[0]?.[0];
        expect(inserted.fromPhone).toBe('[redacted]');
        expect(inserted.phoneHash).toMatch(/^[a-f0-9]{64}$/);
        expect(inserted.phoneEncrypted).toMatch(/^v1:/);
        expect(inserted.body).toBe('[encrypted:16]');
        expect(inserted.bodyEncrypted).toMatch(/^v1:/);
        expect(inserted.phoneEncrypted).not.toContain('5511999999999');
        expect(inserted.bodyEncrypted).not.toContain('mensagem secreta');
    });

    it('decrypts body_encrypted for context reads after cutover', async () => {
        const { encryptString } = await import('../../pii/crypto');
        mockDb.limit.mockResolvedValueOnce([{
            body: '[encrypted:2]',
            bodyEncrypted: encryptString('oi'),
            direction: 'inbound',
            intent: 'UNKNOWN',
            intentConfidence: null,
            createdAt: new Date('2026-02-25T12:00:00.000Z'),
        }]);

        const result = await repo.getLastMessages('tenant-1', 'whatsapp:+5511999999999', 1);

        expect(result[0]?.body).toBe('oi');
    });

    it('falls back to legacy lookup when hash query has no rows', async () => {
        mockDb.limit
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([makeRow('legacy-msg', 1000)]);

        const result = await repo.getLastMessages('tenant-1', 'whatsapp:+5511999999999', 1);

        expect(mockDb.select).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(1);
        expect(result[0]?.body).toBe('legacy-msg');
    });
});
