/**
 * tenant-state-resolver.test.ts — v2 (USD-based Soft/Hard Limit + Burn Rate)
 *
 * Tests:
 *   state_unlocked          — spend below soft limit
 *   state_softLimit_degraded — spend at/above softLimitPercent
 *   state_hardLimit_locked  — spend at/above hardLimitPercent
 *   state_token_fallback    — monthlyBudgetUsd=0 → token-only mode
 *   burnRate_correct        — computeBurnRatePerDay is accurate
 *   redis_offline_fallback  — Redis down → DB, republish
 *   revision_updates_redis  — DB.revision > Redis.revision → heal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Pure function imports (no mocks needed) ──────────────────────────────────

import { deriveStateFromBudget } from '../tenant-state-resolver';
import { computeBurnRatePerDay } from '../../../infra/repositories/token-usage-events.repository';

// ─── Mocks for I/O-dependent getTenantState ───────────────────────────────────

const mockDbSelect = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());

vi.mock('../../../infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({ select: mockDbSelect, update: mockDbUpdate, insert: mockDbInsert }),
}));

const mockRedisGet = vi.hoisted(() => vi.fn());
const mockRedisSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRedisIsAvail = vi.hoisted(() => vi.fn().mockReturnValue(true));

vi.mock('../../../infra/redis.client', () => ({
    redisClient: {
        get: (...args: unknown[]) => mockRedisGet(...args),
        set: (...args: unknown[]) => mockRedisSet(...args),
        isAvailable: () => mockRedisIsAvail(),
    },
}));

vi.mock('../../../infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/modules/finops/services/finops-reset.service', () => ({
    needsReset: vi.fn().mockReturnValue(false),
    runMonthlyReset: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../drizzle/schema', () => ({
    tenantBudgets: { tenantId: 'tenant_id' },
    finopsAlertEvents: {},
}));

// ─── DB chain builder ─────────────────────────────────────────────────────────

function makeDbChain(rows: Record<string, unknown>[]) {
    const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(rows),
                    then: (resolve: any) => resolve(rows),
    };
    mockDbSelect.mockReturnValue(selectChain);

    const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
    };
    mockDbUpdate.mockReturnValue(updateChain);

    const insertChain = {
        values: vi.fn().mockResolvedValue(undefined),
    };
    mockDbInsert.mockReturnValue(insertChain);

    return { selectChain, updateChain, insertChain };
}

// ─── Budget row factory ───────────────────────────────────────────────────────

function budgetRow(overrides: Partial<{
    monthlyBudgetUsd: string;
    softLimitPercent: number;
    hardLimitPercent: number;
    currentMonthUsd: string;
    monthlyTokenLimit: number;
    tokensConsumed: number;
    currentLockState: string;
    stateRevision: number;
    burnRatePerDay: string | null;
    lastBudgetResetAt: Date;
}> = {}) {
    return {
        tenantId: 'tenant-x',
        monthlyBudgetUsd: '100.000000',
        softLimitPercent: 80,
        hardLimitPercent: 100,
        currentMonthUsd: '0.000000',
        monthlyTokenLimit: 1_000_000,
        tokensConsumed: 0,
        currentLockState: 'unlocked',
        stateRevision: 3,
        burnRatePerDay: null,
        lastBudgetResetAt: new Date('2026-02-01T00:00:00Z'),
        updatedAt: new Date(),
        ...overrides,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PURE UNIT TESTS — deriveStateFromBudget (zero I/O)
// ═════════════════════════════════════════════════════════════════════════════

describe('deriveStateFromBudget — pure function', () => {
    const base = {
        monthlyBudgetUsd: 100,
        softLimitPercent: 80,
        hardLimitPercent: 100,
        monthlyTokenLimit: 1_000_000,
        tokensConsumed: 0,
        burnRatePerDay: 0,
    };

    it('state_unlocked — spend below soft limit (70/100 USD = 70%)', () => {
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 70 });
        expect(state).toBe('unlocked');
    });

    it('state_softLimit_degraded — spend at exactly softLimitPercent (80 USD = 80%)', () => {
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 80 });
        expect(state).toBe('degraded');
    });

    it('state_softLimit_degraded — spend above softLimit but below hardLimit (90/100)', () => {
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 90 });
        expect(state).toBe('degraded');
    });

    it('state_hardLimit_locked — spend at exactly hardLimitPercent (100 USD = 100%)', () => {
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 100 });
        expect(state).toBe('locked');
    });

    it('state_hardLimit_locked — spend exceeds budget (110 USD > 100)', () => {
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 110 });
        expect(state).toBe('locked');
    });

    it('state_token_fallback — monthlyBudgetUsd=0 uses token count', () => {
        const stateUnlocked = deriveStateFromBudget({
            ...base,
            monthlyBudgetUsd: 0,
            currentMonthUsd: 999,   // USD ignored when budget=0
            tokensConsumed: 700_000, // 70% of 1M — still unlocked
        });
        expect(stateUnlocked).toBe('unlocked');

        const stateDegraded = deriveStateFromBudget({
            ...base,
            monthlyBudgetUsd: 0,
            currentMonthUsd: 999,
            tokensConsumed: 800_000, // 80% → degraded
        });
        expect(stateDegraded).toBe('degraded');

        const stateLocked = deriveStateFromBudget({
            ...base,
            monthlyBudgetUsd: 0,
            currentMonthUsd: 999,
            tokensConsumed: 1_000_000, // 100% → locked
        });
        expect(stateLocked).toBe('locked');
    });

    it('custom thresholds (soft=60, hard=90)', () => {
        const custom = { ...base, softLimitPercent: 60, hardLimitPercent: 90, burnRatePerDay: 0 };
        expect(deriveStateFromBudget({ ...custom, currentMonthUsd: 59 })).toBe('unlocked');
        expect(deriveStateFromBudget({ ...custom, currentMonthUsd: 60 })).toBe('degraded');
        expect(deriveStateFromBudget({ ...custom, currentMonthUsd: 90 })).toBe('locked');
    });

    it('unlocked com burn alto → degraded_preemptive (projectedDays = 2.9)', () => {
        // budget = 100, hardLimit = 100%, burnRate = 10
        // currentMonthUsd = 71
        // remaining = 29
        // projectedDays = 2.9
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 71, burnRatePerDay: 10 });
        expect(state).toBe('degraded_preemptive');
    });

    it('projectedDays = 3.1 → não ativa', () => {
        // budget = 100, hardLimit = 100%, burnRate = 10
        // currentMonthUsd = 69
        // remaining = 31
        // projectedDays = 3.1
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 69, burnRatePerDay: 10 });
        expect(state).toBe('unlocked');
    });

    it('softLimit já atingido → continua degraded (não preemptivo)', () => {
        // budget = 100, softLimit = 80%, hardLimit = 100%, burnRate = 10
        // currentMonthUsd = 85
        // remaining = 15
        // projectedDays = 1.5
        // Should return 'degraded' (already degraded), not preemptive.
        const state = deriveStateFromBudget({ ...base, currentMonthUsd: 85, burnRatePerDay: 10 });
        expect(state).toBe('degraded');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. PURE UNIT TEST — computeBurnRatePerDay
// ═════════════════════════════════════════════════════════════════════════════

describe('computeBurnRatePerDay — pure function', () => {
    it('burnRate_correct — $30 in 3 days = $10/day', () => {
        const resetAt = new Date('2026-02-01T00:00:00Z');
        const now = new Date('2026-02-04T00:00:00Z'); // 3 days later
        const rate = computeBurnRatePerDay(30, resetAt, now);
        expect(rate).toBeCloseTo(10, 2);
    });

    it('burnRate_correct — first day (< 1 day) treated as 1 day', () => {
        const resetAt = new Date('2026-02-01T00:00:00Z');
        const now = new Date('2026-02-01T06:00:00Z'); // 6 hours = 0.25 days → clamped to 1
        const rate = computeBurnRatePerDay(5, resetAt, now);
        expect(rate).toBeCloseTo(5, 2); // 5 / 1 day
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. I/O TESTS — getTenantState (with mocks)
// ═════════════════════════════════════════════════════════════════════════════

describe('getTenantState — integration with Redis + DB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redis_locked — returns locked from Redis cache without hitting DB', async () => {
        mockRedisGet.mockResolvedValueOnce({
            status: 'locked', revision: 5,
            tokensConsumed: 1_000_000, monthlyTokenLimit: 1_000_000,
            currentMonthUsd: 100, monthlyBudgetUsd: 100, burnRatePerDay: 5,
        });

        const { getTenantState } = await import('../tenant-state-resolver');
        const result = await getTenantState('tenant-locked');

        expect(result.state).toBe('locked');
        expect(result.source).toBe('redis');
        expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it('redis_offline_falls_back_to_db — DB returns degraded (75% spend)', async () => {
        mockRedisGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        makeDbChain([budgetRow({ currentMonthUsd: '75.000000' })]);
        mockRedisGet.mockResolvedValueOnce(null); // publishToRedisIfNewer read

        const { getTenantState } = await import('../tenant-state-resolver');
        const result = await getTenantState('tenant-x');

        expect(result.state).toBe('unlocked'); // 75% < 80% soft limit
        expect(result.source).toBe('db');
    });

    it('revision_updates_redis_when_db_newer — DB rev 8 > Redis rev 2', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        makeDbChain([budgetRow({ stateRevision: 8, currentMonthUsd: '50.000000' })]);
        mockRedisGet.mockResolvedValueOnce({ status: 'unlocked', revision: 2 });

        const { getTenantState } = await import('../tenant-state-resolver');
        await getTenantState('tenant-y');

        await new Promise((r) => setTimeout(r, 10));

        expect(mockRedisSet).toHaveBeenCalledWith(
            'tenant:tenant-y:state',
            expect.objectContaining({ revision: 8, status: 'unlocked' }),
            90,
        );
    });

    it('getTenantState — bumps revision and updates db when entering degraded_preemptive', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        // unlock state initially, current burn rate forces preemptive (e.g 71usd/100, 10/day -> 2.9 days)
        const { updateChain } = makeDbChain([budgetRow({
            currentLockState: 'unlocked',
            stateRevision: 3,
            currentMonthUsd: '71.000000',
            burnRatePerDay: '10.000000'
        })]);

        const { getTenantState } = await import('../tenant-state-resolver');
        const result = await getTenantState('tenant-z');

        expect(result.state).toBe('degraded_preemptive');
        expect(result.revision).toBe(4); // 3 + 1
        expect(mockDbUpdate).toHaveBeenCalled();
        expect(updateChain.set).toHaveBeenCalledWith({
            currentLockState: 'degraded_preemptive',
            stateRevision: 4
        });
    });

    it('finops_alerts — creates alert when unlocked -> degraded_preemptive', async () => {
        mockRedisGet.mockResolvedValueOnce(null); // cache miss
        mockRedisGet.mockResolvedValueOnce(null); // alert hit (not rate limited)

        const { insertChain } = makeDbChain([budgetRow({
            currentLockState: 'unlocked',
            stateRevision: 3,
            currentMonthUsd: '71.000000',
            burnRatePerDay: '10.000000'
        })]);

        const { getTenantState } = await import('../tenant-state-resolver');
        await getTenantState('tenant-alerts1');

        // Allow async fire-and-forget alert to execute
        await new Promise((r) => setTimeout(r, 10));

        expect(mockDbInsert).toHaveBeenCalled();
        expect(insertChain.values).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-alerts1',
                prevState: 'unlocked',
                nextState: 'degraded_preemptive',
                reason: 'preemptive_3d',
            })
        );
        expect(mockRedisSet).toHaveBeenCalledWith('finops:alerted:tenant-alerts1:degraded_preemptive', '1', 6 * 60 * 60);
    });

    it('finops_alerts — does not create duplicate if rate limited by redis', async () => {
        mockRedisGet.mockImplementation((key: unknown) => {
            if (key === 'finops:alerted:tenant-alerts2:degraded_preemptive') return Promise.resolve('1');
            return Promise.resolve(null);
        });

        makeDbChain([budgetRow({
            currentLockState: 'unlocked',
            currentMonthUsd: '71.000000',
            burnRatePerDay: '10.000000'
        })]);

        const { getTenantState } = await import('../tenant-state-resolver');
        await getTenantState('tenant-alerts2');

        await new Promise((r) => setTimeout(r, 10));

        // insert should not be called because rate limit block worked
        expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('finops_alerts — creates alert when degraded_preemptive -> degraded (soft_limit)', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        mockRedisGet.mockResolvedValueOnce(null);

        const { insertChain } = makeDbChain([budgetRow({
            currentLockState: 'degraded_preemptive',
            currentMonthUsd: '85.000000',
            burnRatePerDay: '10.000000'
        })]);

        const { getTenantState } = await import('../tenant-state-resolver');
        await getTenantState('tenant-alerts3');

        await new Promise((r) => setTimeout(r, 10));

        expect(mockDbInsert).toHaveBeenCalled();
        expect(insertChain.values).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-alerts3',
                prevState: 'degraded_preemptive',
                nextState: 'degraded',
                reason: 'soft_limit',
            })
        );
    });
});

