/**
 * FinOps Budget Service
 *
 * Cálculos puros para a visão executiva FinOps do Cockpit.
 * Sem dependências de I/O — todas as funções são testáveis em isolamento.
 */

import { COST_PER_1K } from '../../infra/repositories/token-usage-events.repository';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RawBudgetRow {
    currentLockState: string;
    monthlyBudgetUsd: string | number;
    softLimitPercent: number;
    hardLimitPercent: number;
    currentMonthUsd: string | number;
    burnRatePerDay: string | number | null;
    monthlyTokenLimit: number;
    tokensConsumed: number;
    lastBudgetResetAt: Date | null;
}

export interface UsageEventRow {
    model_used: string;
    input_tokens: number;
    output_tokens: number;
}

export interface FinOpsPayload {
    state: 'unlocked' | 'degraded' | 'degraded_preemptive' | 'locked';
    monthlyBudgetUsd: number;
    currentMonthUsd: number;
    percentUsed: number;
    burnRatePerDay: number;
    projectedDaysToHardLimit: number | null;
    softLimitPercent: number;
    hardLimitPercent: number;
    estimatedSavingsFromDegradeUsd: number;
    lastBudgetResetAt: string | null;
}

// ─── Pure computations ─────────────────────────────────────────────────────────

/**
 * projectedDaysToHardLimit:
 *   hardRemaining = monthlyBudget * hardLimit% - currentMonthUsd
 *   days          = hardRemaining / burnRatePerDay   (null if burn=0)
 */
export function computeProjectedDays(
    monthlyBudgetUsd: number,
    hardLimitPercent: number,
    currentMonthUsd: number,
    burnRatePerDay: number,
): number | null {
    if (burnRatePerDay <= 0) return null;
    const hardCap = monthlyBudgetUsd * (hardLimitPercent / 100);
    const remaining = hardCap - currentMonthUsd;
    if (remaining <= 0) return 0;
    return remaining / burnRatePerDay;
}

/**
 * percentUsed = (currentMonthUsd / monthlyBudgetUsd) * 100
 * Clamped to [0, 100] and rounded to 2 decimal places.
 * Returns 0 when monthlyBudgetUsd = 0 (token-only mode).
 */
export function computePercentUsed(currentMonthUsd: number, monthlyBudgetUsd: number): number {
    if (monthlyBudgetUsd <= 0) return 0;
    const pct = (currentMonthUsd / monthlyBudgetUsd) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

/**
 * Estimate USD savings if model is degraded for the next 7 days.
 *
 * For each event row in the last 7 days:
 *   premiumCost  = cost at current (premium) model rates
 *   degradedCost = cost at DEGRADED_MODEL rates
 *   savings      = premiumCost - degradedCost
 *
 * degradedModelKey defaults to 'gpt-4o-mini' (same as getDegradedModel()).
 */
export function computeEstimatedSavings(
    events: UsageEventRow[],
    degradedModelKey = 'gpt-4o-mini',
): number {
    const degradedRates = COST_PER_1K[degradedModelKey] ?? { input: 0.00015, output: 0.0006 };

    let savings = 0;
    for (const ev of events) {
        const premiumKey = Object.keys(COST_PER_1K).find((k) =>
            ev.model_used.toLowerCase().includes(k),
        ) ?? '';
        const premiumRates = COST_PER_1K[premiumKey];
        if (!premiumRates) continue; // unknown model — skip

        const premiumCost =
            (ev.input_tokens / 1000) * premiumRates.input +
            (ev.output_tokens / 1000) * premiumRates.output;
        const degradedCost =
            (ev.input_tokens / 1000) * degradedRates.input +
            (ev.output_tokens / 1000) * degradedRates.output;

        savings += Math.max(0, premiumCost - degradedCost);
    }

    return Math.round(savings * 1_000_000) / 1_000_000; // 6 decimal precision
}

/**
 * Assembles the final FinOpsPayload from raw DB rows.
 * Pure function — no I/O.
 */
export function buildFinOpsPayload(
    budget: RawBudgetRow,
    recentEvents: UsageEventRow[],
): FinOpsPayload {
    const monthlyBudgetUsd = Number(budget.monthlyBudgetUsd ?? 0);
    const currentMonthUsd = Number(budget.currentMonthUsd ?? 0);
    const burnRatePerDay = Number(budget.burnRatePerDay ?? 0);

    const state = (budget.currentLockState as FinOpsPayload['state']) ?? 'unlocked';
    const percentUsed = computePercentUsed(currentMonthUsd, monthlyBudgetUsd);
    const projectedDaysToHardLimit = computeProjectedDays(
        monthlyBudgetUsd,
        budget.hardLimitPercent ?? 100,
        currentMonthUsd,
        burnRatePerDay,
    );
    const estimatedSavingsFromDegradeUsd = computeEstimatedSavings(recentEvents);

    return {
        state,
        monthlyBudgetUsd,
        currentMonthUsd,
        percentUsed,
        burnRatePerDay,
        projectedDaysToHardLimit,
        softLimitPercent: budget.softLimitPercent ?? 80,
        hardLimitPercent: budget.hardLimitPercent ?? 100,
        estimatedSavingsFromDegradeUsd,
        lastBudgetResetAt: budget.lastBudgetResetAt ? budget.lastBudgetResetAt.toISOString() : null,
    };
}
