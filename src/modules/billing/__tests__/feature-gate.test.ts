/**
 * Unit tests for FeatureGateService.
 * Tests: FREE limit, PRO pass-through, feature flag enforcement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- DB mock (must be hoisted before imports) ---
vi.mock('../../../infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('../../../infra/logger', () => ({
    logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// We mock the tenants table module to control plan values
vi.mock('../../../drizzle/schema', () => ({
    tenants: 'tenants_mock',
    simulations: 'simulations_mock',
    messages: 'messages_mock',
}));

vi.mock('drizzle-orm', async () => {
    const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
    return { ...actual, eq: vi.fn(() => 'eq_mock'), and: vi.fn(() => 'and_mock'), gte: vi.fn(() => 'gte_mock'), sql: actual.sql };
});

import { getDb } from '../../../infra/db';
import { FeatureGateService } from '../feature-gate.service';
import { Plan } from '../../../lib/billing/plans';
import { ErrorCode } from '../../../infra/errors';

function makeDbMock(planValue: string, rowCount: number) {
    const queryChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ plan: planValue }]),
    };
    // For count queries
    const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: rowCount }]),
    };

    return {
        select: vi.fn().mockImplementation((fields: any) => {
            // If selecting plan, use queryChain; if counting, use countChain
            const hasCount = fields && JSON.stringify(fields).includes('COUNT');
            return hasCount ? countChain : queryChain;
        }),
    };
}

describe('FeatureGateService', () => {
    let service: FeatureGateService;

    beforeEach(() => {
        service = new FeatureGateService();
        vi.clearAllMocks();
    });

    describe('assertWithinSimulationLimit', () => {
        it('FREE plan: blocks when at daily limit of 20', async () => {
            // First call returns plan, second returns count
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'FREE' }]) }) }) })
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 20 }]) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinSimulationLimit('tenant-free')).rejects.toMatchObject({
                code: ErrorCode.PLAN_LIMIT_EXCEEDED,
            });
        });

        it('FREE plan: passes when under daily limit', async () => {
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'FREE' }]) }) }) })
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 10 }]) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinSimulationLimit('tenant-free')).resolves.toBeUndefined();
        });

        it('PRO plan: passes even with high usage (1000 limit)', async () => {
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'PRO' }]) }) }) })
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 500 }]) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinSimulationLimit('tenant-pro')).resolves.toBeUndefined();
        });

        it('ENTERPRISE plan: always passes (Infinity limit, no DB count query)', async () => {
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'ENTERPRISE' }]) }) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinSimulationLimit('tenant-enterprise')).resolves.toBeUndefined();
            // select should only be called once (for plan lookup, not for counting)
            expect(db.select).toHaveBeenCalledTimes(1);
        });
    });

    describe('assertFeatureEnabled', () => {
        it('FREE plan: webhookAIEnabled is disabled → throws FEATURE_DISABLED', async () => {
            const db = {
                select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'FREE' }]) }) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertFeatureEnabled('tenant-free', 'webhookAIEnabled')).rejects.toMatchObject({
                code: ErrorCode.FEATURE_DISABLED,
            });
        });

        it('STARTER plan: webhookAIEnabled → resolves', async () => {
            const db = {
                select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'STARTER' }]) }) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertFeatureEnabled('tenant-starter', 'webhookAIEnabled')).resolves.toBeUndefined();
        });
    });

    describe('assertWithinMessageLimit', () => {
        it('FREE plan: blocks at 500 messages/month', async () => {
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'FREE' }]) }) }) })
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 500 }]) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinMessageLimit('tenant-free')).rejects.toMatchObject({
                code: ErrorCode.PLAN_LIMIT_EXCEEDED,
            });
        });

        it('PRO plan: 3000 messages — within 15000 limit', async () => {
            const db = {
                select: vi.fn()
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ plan: 'PRO' }]) }) }) })
                    .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 3000 }]) }) }),
            };
            vi.mocked(getDb).mockResolvedValue(db as any);

            await expect(service.assertWithinMessageLimit('tenant-pro')).resolves.toBeUndefined();
        });
    });
});
