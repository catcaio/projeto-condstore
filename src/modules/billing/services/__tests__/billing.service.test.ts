/**
 * billing.service.test.ts
 *
 * Strategy: mock getDb to return a configurable mock whose
 * select().from().where().limit() returns different fixtures
 * based on call order (plans first, then budgets).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── State ─────────────────────────────────────────────────────────────────────

const insertCapture: any[] = [];
let selectCallCount = 0;
let planRows: any[] = [];
let budgetRows: any[] = [];

// Order: service calls select for plans (1st), then budgets (2nd)
function makeSelectChain() {
    return {
        from: (_table: any) => ({
            where: (_cond: any) => ({
                limit: (_n: number) => {
                    selectCallCount++;
                    if (selectCallCount === 1) return Promise.resolve(planRows);
                    if (selectCallCount === 2) return Promise.resolve(budgetRows);
                    return Promise.resolve([]);
                },
                then: (_resolve: any) => {
                    selectCallCount++;
                    if (selectCallCount === 1) return _resolve(planRows);
                    if (selectCallCount === 2) return _resolve(budgetRows);
                    return _resolve([]);
                },
            }),
            innerJoin: (_t2: any, _cond: any) => ({
                where: (_c: any) => ({
                    limit: (_n: number) => Promise.resolve([]),
                }),
            }),
        }),
    };
}

function makeMockDb() {
    return {
        select: (_fields?: any) => makeSelectChain(),
        insert: (_table: any) => ({
            values: (vals: any) => {
                insertCapture.push({ ...vals });
                return { execute: () => Promise.resolve() };
            },
        }),
        update: (_table: any) => ({
            set: (_vals: any) => ({
                where: (_cond: any) => ({ execute: () => Promise.resolve() }),
            }),
        }),
    };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn(() => true),
        set: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/modules/finops/cache-keys', () => ({
    finopsCacheKey: (id: string) => `cockpit:finops:${id}`,
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { upgradeTenantPlan, BillingServiceError } from '../billing.service';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRO_PLAN = {
    id: 'plan_pro',
    name: 'Pro',
    monthlyPriceUsd: '99.000000',
    monthlyBudgetUsd: '500.000000',
    softLimitPercent: 80,
    hardLimitPercent: 100,
    active: 1,
};

const BUDGET_ROW = { stateRevision: 3 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('upgradeTenantPlan', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        insertCapture.length = 0;
        selectCallCount = 0;
        planRows = [];
        budgetRows = [];
        (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockDb());
    });

    it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
        planRows = [];

        const err = await upgradeTenantPlan('t1', 'plan_xxx').catch((e) => e);
        expect(err).toBeInstanceOf(BillingServiceError);
        expect(err.code).toBe('PLAN_NOT_FOUND');
    });

    it('throws PLAN_INACTIVE when plan.active === 0', async () => {
        planRows = [{ ...PRO_PLAN, active: 0 }];

        const err = await upgradeTenantPlan('t1', 'plan_pro').catch((e) => e);
        expect(err).toBeInstanceOf(BillingServiceError);
        expect(err.code).toBe('PLAN_INACTIVE');
    });

    it('throws TENANT_BUDGET_NOT_FOUND when no budget row', async () => {
        planRows = [PRO_PLAN];
        budgetRows = [];

        const err = await upgradeTenantPlan('t1', 'plan_pro').catch((e) => e);
        expect(err).toBeInstanceOf(BillingServiceError);
        expect(err.code).toBe('TENANT_BUDGET_NOT_FOUND');
    });

    it('returns correct shape on success', async () => {
        planRows = [PRO_PLAN];
        budgetRows = [BUDGET_ROW];

        const result = await upgradeTenantPlan('tenant-a', 'plan_pro', 'req-abc');

        expect(result).toMatchObject({
            status: 'upgraded',
            plan: 'Pro',
            planId: 'plan_pro',
            newBudget: 500,
            softLimitPercent: 80,
            hardLimitPercent: 100,
            stateRevision: 4, // 3 + 1
        });
    });

    it('increments stateRevision by 1', async () => {
        planRows = [PRO_PLAN];
        budgetRows = [{ stateRevision: 7 }];

        const result = await upgradeTenantPlan('tenant-b', 'plan_pro');
        expect(result.stateRevision).toBe(8);
    });

    it('inserts a billing_ledger entry of type=upgrade with correct metadata', async () => {
        planRows = [PRO_PLAN];
        budgetRows = [BUDGET_ROW];

        await upgradeTenantPlan('tenant-c', 'plan_pro', 'req-ledger');

        const ledger = insertCapture.find((v) => v.type === 'upgrade');
        expect(ledger).toBeDefined();
        expect(ledger.tenantId).toBe('tenant-c');
        expect(ledger.metadata).toMatchObject({
            planId: 'plan_pro',
            planName: 'Pro',
            monthlyBudgetUsd: 500,
            requestId: 'req-ledger',
        });
    });

    it('invalidates both redis caches after upgrade', async () => {
        planRows = [PRO_PLAN];
        budgetRows = [BUDGET_ROW];

        await upgradeTenantPlan('tenant-d', 'plan_pro');
        await new Promise((r) => setTimeout(r, 20));

        expect(redisClient.set).toHaveBeenCalledWith('tenant:tenant-d:state', null, 0);
        expect(redisClient.set).toHaveBeenCalledWith('cockpit:finops:tenant-d', null, 0);
    });
});
