import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentResetMonth, needsReset, runMonthlyReset } from '../finops-reset.service';

const mockDbTransaction = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbSelect = vi.hoisted(() => vi.fn());

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        transaction: mockDbTransaction,
    }),
}));

const mockRedisSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRedisIsAvail = vi.hoisted(() => vi.fn().mockReturnValue(true));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        set: (...args: unknown[]) => mockRedisSet(...args),
        isAvailable: () => mockRedisIsAvail(),
    },
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    }
}));

describe('finops-reset.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Configuração padrão do transaction mock para rodar o callback
        mockDbTransaction.mockImplementation(async (cb) => {
            const tx = {
                insert: vi.fn().mockReturnValue({ values: mockDbInsert }),
                update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: mockDbUpdate }) }),
                select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockDbSelect.mockResolvedValue([{ stateRevision: 5 }]) }) }) })
            };
            return cb(tx);
        });
    });

    describe('getCurrentResetMonth', () => {
        it('returns YYYY-MM correctly for UTC dates', () => {
            expect(getCurrentResetMonth(new Date('2026-05-01T10:00:00Z'))).toBe('2026-05');
            expect(getCurrentResetMonth(new Date('2026-11-15T10:00:00Z'))).toBe('2026-11');
        });
    });

    describe('needsReset', () => {
        it('returns true if lastBudgetResetAt is null', () => {
            expect(needsReset(null, new Date())).toBe(true);
        });

        it('returns false if same month', () => {
            const last = new Date('2026-05-01T00:00:00Z');
            const now = new Date('2026-05-15T00:00:00Z');
            expect(needsReset(last, now)).toBe(false);
        });

        it('returns true if month changed', () => {
            const last = new Date('2026-05-31T23:59:59Z');
            const now = new Date('2026-06-01T00:00:00Z');
            expect(needsReset(last, now)).toBe(true);
        });
    });

    describe('runMonthlyReset', () => {
        it('executes full monthly reset pipeline correctly', async () => {
            const now = new Date('2026-06-01T00:00:00Z');

            await runMonthlyReset('tenant-reset', now, 55.4, 2.1);

            // Verificações DB
            expect(mockDbTransaction).toHaveBeenCalled();

            // 1. Insert History
            expect(mockDbInsert).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenant-reset',
                resetMonth: '2026-06',
                prevCurrentMonthUsd: '55.400000',
                prevBurnRatePerDay: '2.100000',
                performedAt: now,
            }));

            // 2. Budget Update
            expect(mockDbUpdate).toHaveBeenCalledTimes(2); // One for budget, one for lock_events

            // 3. Redis Invalidates
            expect(mockRedisIsAvail).toHaveBeenCalled();
            expect(mockRedisSet).toHaveBeenCalledWith('cockpit:finops:tenant-reset', null, 0);
            expect(mockRedisSet).toHaveBeenCalledWith('tenant:tenant-reset:state', null, 0);
        });

        it('handles duplicate gracefully (idempotency)', async () => {
            const now = new Date('2026-06-01T00:00:00Z');

            mockDbTransaction.mockImplementationOnce(async () => {
                const err = new Error('Dup') as any;
                err.code = 'ER_DUP_ENTRY';
                throw err;
            });

            // Se for duplicado de race, vai dar throw dentro do try e retornar undefined liso.
            await expect(runMonthlyReset('tenant-reset', now, 50, 1)).resolves.toBeUndefined();
        });
    });
});
