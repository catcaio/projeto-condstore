/**
 * finops-budget.service.test.ts
 *
 * Pure unit tests for FinOps calculation functions:
 *   - computeProjectedDays
 *   - computePercentUsed
 *   - computeEstimatedSavings
 *   - buildFinOpsPayload
 *   - cache invalidation contract
 */

import { describe, it, expect, vi } from 'vitest';
import {
    computeProjectedDays,
    computePercentUsed,
    computeEstimatedSavings,
    buildFinOpsPayload,
    type RawBudgetRow,
    type UsageEventRow,
} from '../finops-budget.service';

// Mocks needed for the repository import used in the cache-key contract test.
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/redis.client', () => ({
    redisClient: { isAvailable: vi.fn().mockReturnValue(false), get: vi.fn(), set: vi.fn() },
}));
vi.mock('@/infra/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

// ─── computeProjectedDays ─────────────────────────────────────────────────────

describe('computeProjectedDays', () => {
    it('projection_correct — $50 remaining / $5/day = 10 days', () => {
        const days = computeProjectedDays(100, 100, 50, 5);
        expect(days).toBeCloseTo(10, 2);
    });

    it('projection_zero_burn_rate — returns null (no meaningful projection)', () => {
        expect(computeProjectedDays(100, 100, 50, 0)).toBeNull();
    });

    it('projection_already_exceeded — returns 0', () => {
        // currentMonthUsd (105) >= hardCap (100 * 100% = 100)
        const days = computeProjectedDays(100, 100, 105, 5);
        expect(days).toBe(0);
    });

    it('projection_degraded_zone — soft exceeded but days still positive', () => {
        // budget=100, hardLimit=100%, current=85 (degraded), burn=3
        // remaining = 100 - 85 = 15; 15/3 = 5 days
        const days = computeProjectedDays(100, 100, 85, 3);
        expect(days).toBeCloseTo(5, 2);
    });

    it('custom hard limit — 90% cap', () => {
        // hardCap = 100 * 90% = 90; current=80; remaining=10; burn=2 → 5 days
        const days = computeProjectedDays(100, 90, 80, 2);
        expect(days).toBeCloseTo(5, 2);
    });
});

// ─── computePercentUsed ───────────────────────────────────────────────────────

describe('computePercentUsed', () => {
    it('percentUsed_correct — $75 of $100 = 75%', () => {
        expect(computePercentUsed(75, 100)).toBe(75);
    });

    it('percentUsed_zero_budget — returns 0 (token-only mode)', () => {
        expect(computePercentUsed(999, 0)).toBe(0);
    });

    it('percentUsed_clamped_at_100 — does not exceed 100', () => {
        expect(computePercentUsed(150, 100)).toBe(100);
    });

    it('percentUsed_rounding — 1/3 rounded to 2 decimals', () => {
        expect(computePercentUsed(1, 3)).toBe(33.33);
    });
});

// ─── computeEstimatedSavings ──────────────────────────────────────────────────

describe('computeEstimatedSavings', () => {
    // gpt-4o: $0.005/1k input, $0.015/1k output
    // gpt-4o-mini: $0.00015/1k input, $0.0006/1k output
    // savings per 1K in / 1K out ≈ (0.005 - 0.00015) + (0.015 - 0.0006) = 0.01935

    it('savings_correct — 1 event with gpt-4o', () => {
        const events: UsageEventRow[] = [{ model_used: 'gpt-4o', input_tokens: 1000, output_tokens: 1000 }];
        const savings = computeEstimatedSavings(events);
        // premium cost: (1000/1000)*0.005 + (1000/1000)*0.015 = 0.020
        // degraded cost: (1000/1000)*0.00015 + (1000/1000)*0.0006 = 0.00075
        // savings ≈ 0.01925
        expect(savings).toBeCloseTo(0.01925, 4);
    });

    it('savings_zero — unknown model yields no savings', () => {
        const events: UsageEventRow[] = [{ model_used: 'local-llm', input_tokens: 5000, output_tokens: 2000 }];
        expect(computeEstimatedSavings(events)).toBe(0);
    });

    it('savings_zero — empty events', () => {
        expect(computeEstimatedSavings([])).toBe(0);
    });

    it('savings_multiple_events — accumulates correctly', () => {
        const events: UsageEventRow[] = [
            { model_used: 'gpt-4o', input_tokens: 2000, output_tokens: 500 },
            { model_used: 'gpt-4o', input_tokens: 1000, output_tokens: 1000 },
        ];
        const single = computeEstimatedSavings([events[0]]);
        const combined = computeEstimatedSavings(events);
        expect(combined).toBeGreaterThan(single);
    });
});

// ─── buildFinOpsPayload ───────────────────────────────────────────────────────

describe('buildFinOpsPayload', () => {
    const baseBudget: RawBudgetRow = {
        currentLockState: 'unlocked',
        monthlyBudgetUsd: '100.000000',
        softLimitPercent: 80,
        hardLimitPercent: 100,
        currentMonthUsd: '50.000000',
        burnRatePerDay: '5.000000',
        monthlyTokenLimit: 1_000_000,
        tokensConsumed: 400_000,
        lastBudgetResetAt: new Date('2026-05-01T00:00:00Z'),
    };

    it('state_reflected_from_budget_row', () => {
        const payload = buildFinOpsPayload({ ...baseBudget, currentLockState: 'degraded' }, []);
        expect(payload.state).toBe('degraded');
    });

    it('percent_used_correct', () => {
        const payload = buildFinOpsPayload(baseBudget, []);
        expect(payload.percentUsed).toBe(50); // 50/100
    });

    it('projection_correct_for_unlocked_tenant', () => {
        // remaining = 100 - 50 = 50; burn = 5/day → 10 days
        const payload = buildFinOpsPayload(baseBudget, []);
        expect(payload.projectedDaysToHardLimit).toBeCloseTo(10, 1);
    });

    it('savings_included_from_events', () => {
        const events: UsageEventRow[] = [
            { model_used: 'gpt-4o', input_tokens: 1000, output_tokens: 1000 },
        ];
        const payload = buildFinOpsPayload(baseBudget, events);
        expect(payload.estimatedSavingsFromDegradeUsd).toBeGreaterThan(0);
    });

    it('no_projection_when_burn_is_zero', () => {
        const payload = buildFinOpsPayload({ ...baseBudget, burnRatePerDay: '0' }, []);
        expect(payload.projectedDaysToHardLimit).toBeNull();
    });

    it('locked_state_yields_zero_projected_days', () => {
        const locked: RawBudgetRow = {
            ...baseBudget,
            currentLockState: 'locked',
            currentMonthUsd: '105.000000', // exceeded
        };
        const payload = buildFinOpsPayload(locked, []);
        expect(payload.projectedDaysToHardLimit).toBe(0);
    });
});

// ─── Cache invalidation contract ─────────────────────────────────────────────
// Verifies the canonical cache key contract exposed by the FinOps module.

describe('finopsCacheKey contract', () => {
    it('module exposes the canonical cache key format', async () => {
        const { finopsCacheKey: moduleKey } = await import('@/modules/finops/cache-keys');

        const tenantId = 'tenant-test-123';
        expect(moduleKey(tenantId)).toBe('cockpit:finops:tenant-test-123');
    });
});
