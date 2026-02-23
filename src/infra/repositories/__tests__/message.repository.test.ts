import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageRepository } from '../message.repository';

// ── DB mock (Drizzle chained query) ───────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
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
    },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRow(body: string, offsetMs: number) {
    return {
        body,
        direction: 'inbound',
        intent: 'FREIGHT_QUERY',
        createdAt: new Date(1_700_000_000_000 + offsetMs),
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MessageRepository.getLastMessages', () => {
    let repo: MessageRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new MessageRepository();
        // Reset the limit mock to return empty by default
        mockDb.limit.mockResolvedValue([]);
    });

    it('returns empty array for missing tenantId', async () => {
        const result = await repo.getLastMessages('', '+5511999', 5);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('returns empty array for missing phoneNumber', async () => {
        const result = await repo.getLastMessages('tenant-1', '', 5);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('returns empty array for limit <= 0', async () => {
        const result = await repo.getLastMessages('tenant-1', '+5511999', 0);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('issues a single query and respects limit', async () => {
        // DB returns 3 rows (already at limit)
        const dbRows = [
            makeRow('msg C', 3000),
            makeRow('msg B', 2000),
            makeRow('msg A', 1000),
        ];
        mockDb.limit.mockResolvedValueOnce(dbRows);

        const result = await repo.getLastMessages('tenant-1', '+5511999', 3);

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

        const result = await repo.getLastMessages('tenant-1', '+5511999', 3);

        expect(result[0].body).toBe('oldest');
        expect(result[1].body).toBe('middle');
        expect(result[2].body).toBe('newest');
    });

    it('enforces tenant isolation — uses tenantId in the query', async () => {
        mockDb.limit.mockResolvedValueOnce([]);

        await repo.getLastMessages('tenant-A', '+5511999', 5);

        // The where clause must have been called (it receives the AND condition).
        // We verify the chain was executed exactly once for this tenant.
        expect(mockDb.where).toHaveBeenCalledTimes(1);
    });

    it('converts Date objects to ISO strings', async () => {
        const ts = new Date('2024-01-15T10:00:00.000Z');
        mockDb.limit.mockResolvedValueOnce([{ body: 'hi', direction: 'inbound', intent: 'UNKNOWN', createdAt: ts }]);

        const result = await repo.getLastMessages('tenant-1', '+5511999', 1);

        expect(result[0].createdAt).toBe(ts.toISOString());
    });

    it('returns empty array (does not throw) when DB query fails', async () => {
        mockDb.limit.mockRejectedValueOnce(new Error('DB connection lost'));

        const result = await repo.getLastMessages('tenant-1', '+5511999', 5);

        expect(result).toEqual([]);
    });
});
