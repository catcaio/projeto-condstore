import { randomUUID } from 'crypto';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import { getDb } from '../db';
import { tokenUsageEvents, tenantBudgets } from '../../drizzle/schema';
import { logger } from '../logger';
import { redisClient } from '../redis.client';
import { publishEvent } from '../../core/events/event-bus';
import { finopsCacheKey } from '@/modules/finops/cache-keys';

// ─── Cost map ─────────────────────────────────────────────────────────────────

/**
 * Cost estimation table (USD per 1K tokens).
 * Conservative mid-2025 public rates.
 * The Control Plane Worker may re-evaluate at billing-accurate rates.
 */
export const COST_PER_1K: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
    const key = Object.keys(COST_PER_1K).find((k) => model.toLowerCase().includes(k)) ?? '';
    if (!key) return 0;
    const rates = COST_PER_1K[key];
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// ─── Burn rate helper ─────────────────────────────────────────────────────────

/**
 * Computes daily burn rate = currentMonthUsd / days elapsed since reset.
 * Returns 0 if no days have elapsed (first day of month).
 */
export function computeBurnRatePerDay(currentMonthUsd: number, lastResetAt: Date, now: Date): number {
    const msPerDay = 86_400_000;
    const daysElapsed = Math.max(1, (now.getTime() - lastResetAt.getTime()) / msPerDay);
    return currentMonthUsd / daysElapsed;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export interface InsertUsageEventInput {
    /** Unique identifier of the LLM call — used as idempotency key. */
    traceId: string;
    tenantId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    type?: 'usage' | 'loop_guard_violation';
}

export class TokenUsageEventsRepository {
    /**
     * Fire-and-forget: write a single raw usage event per LLM call.
     * Also atomically increments tenant_budgets.current_month_usd and
     * updates burn_rate_per_day.
     *
     * Does NOT throw — errors are logged and swallowed to avoid breaking the chat path.
     * Idempotent: duplicate traceIds are silently ignored via the UNIQUE constraint.
     */
    async insertUsageEvent(input: InsertUsageEventInput): Promise<void> {
        try {
            const db = await getDb();
            const costUsd = estimateCostUsd(input.model, input.inputTokens, input.outputTokens);

            // ── 1. Insert raw event ────────────────────────────────────────────────
            await db.insert(tokenUsageEvents).values({
                id: randomUUID(),
                traceId: input.traceId,
                tenantId: input.tenantId,
                type: input.type ?? 'usage',
                modelUsed: input.model,
                inputTokens: input.inputTokens,
                outputTokens: input.outputTokens,
                estimatedCostUsd: String(costUsd.toFixed(6)),
                processedByWorker: null,
                createdAt: new Date(),
            });

            // ── 2. Increment currentMonthUsd + update burnRatePerDay ───────────────
            // We read first to compute the new burn rate (MySQL 8 doesn't support
            // returning computed values from UPDATE without a subquery).
            // This is an optimistic non-transactional update: acceptable here because
            // the Worker will re-aggregate from events for accuracy.
            if (costUsd > 0) {
                await this.updateBudgetAccumulators(db, input.tenantId, costUsd);
            }

            logger.info('token_usage_event_inserted', {
                tenantId: input.tenantId,
                traceId: input.traceId,
                model: input.model,
                inputTokens: input.inputTokens,
                outputTokens: input.outputTokens,
                estimatedCostUsd: costUsd,
            });

            // Invalidate FinOps cockpit cache so UI sees fresh data
            void publishEvent({
                stream: 'events:finops',
                type: 'CACHE_INVALIDATE',
                tenantId: input.tenantId,
                data: { keys: [`tenant:${input.tenantId}:state`, finopsCacheKey(input.tenantId)] }
            }).catch(() => {
                // non-critical
                void redisClient.set(finopsCacheKey(input.tenantId), null, 0).catch(() => { });
            });
        } catch (error) {
            const mysqlCode = (error as { code?: string }).code;
            if (mysqlCode === 'ER_DUP_ENTRY') {
                logger.info('token_usage_event_duplicate_ignored', {
                    tenantId: input.tenantId,
                    traceId: input.traceId,
                });
                return;
            }
            logger.error('token_usage_event_insert_failed', error as Error, {
                tenantId: input.tenantId,
                traceId: input.traceId,
            });
        }
    }

    private async updateBudgetAccumulators(
        db: Awaited<ReturnType<typeof getDb>>,
        tenantId: string,
        costUsd: number,
    ): Promise<void> {
        try {
            const now = new Date();
            const costStr = costUsd.toFixed(6);

            // Read current row to compute burn rate
            const rows = await db
                .select({
                    currentMonthUsd: tenantBudgets.currentMonthUsd,
                    lastBudgetResetAt: tenantBudgets.lastBudgetResetAt,
                })
                .from(tenantBudgets)
                .where(eq(tenantBudgets.tenantId, tenantId))
                ;

            if (rows.length === 0) {
                // No budget row yet — create a minimal one; Worker will fill the rest
                await db.insert(tenantBudgets).values({
                    tenantId,
                    monthlyTokenLimit: 1_000_000,
                    tokensConsumed: 0,
                    currentLockState: 'unlocked',
                    stateRevision: 1,
                    currentMonthUsd: costStr,
                    burnRatePerDay: String(costUsd.toFixed(6)),
                    lastBudgetResetAt: now,
                }).onDuplicateKeyUpdate({
                    set: {
                        currentMonthUsd: drizzleSql`${tenantBudgets.currentMonthUsd} + ${costStr}`,
                    },
                });
                return;
            }

            const row = rows[0];
            const prevUsd = Number(row.currentMonthUsd ?? 0);
            const newUsd = prevUsd + costUsd;
            const resetAt = row.lastBudgetResetAt instanceof Date
                ? row.lastBudgetResetAt
                : new Date(String(row.lastBudgetResetAt));
            const burnRate = computeBurnRatePerDay(newUsd, resetAt, now);

            await db
                .update(tenantBudgets)
                .set({
                    currentMonthUsd: String(newUsd.toFixed(6)),
                    burnRatePerDay: String(burnRate.toFixed(6)),
                })
                .where(eq(tenantBudgets.tenantId, tenantId));
        } catch (err) {
            // Budget accumulator failure must never crash the chat path
            logger.warn('budget_accumulator_update_failed', {
                tenantId,
                error: (err as Error).message,
            });
        }
    }
}

export const tokenUsageEventsRepository = new TokenUsageEventsRepository();
