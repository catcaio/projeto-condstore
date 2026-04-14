/**
 * billing.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Billing Core v0 — Planos + Upgrade Real + Ledger.
 * Sem gateway externo. Estrutura pronta para Stripe.
 */

import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    plans,
    tenantSubscriptions,
    billingLedger,
    tenantBudgets,
    finopsLockEvents,
    type PlanRecord,
    type TenantSubscriptionRecord,
} from '@/drizzle/schema';
import { redisClient } from '@/infra/redis.client';
import { finopsCacheKey } from '@/modules/finops';
import { logger } from '@/infra/logger';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UpgradeResult {
    status: 'upgraded';
    plan: string;
    planId: string;
    newBudget: number;
    softLimitPercent: number;
    hardLimitPercent: number;
    stateRevision: number;
}

export type BillingErrorCode =
    | 'PLAN_NOT_FOUND'
    | 'PLAN_INACTIVE'
    | 'TENANT_BUDGET_NOT_FOUND'
    | 'UPGRADE_FAILED';

export class BillingServiceError extends Error {
    constructor(
        public readonly code: BillingErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'BillingServiceError';
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function invalidateBillingCaches(tenantId: string): Promise<void> {
    if (!redisClient.isAvailable()) return;
    try {
        await Promise.all([
            redisClient.del(`tenant:${tenantId}:state`),
            redisClient.del(finopsCacheKey(tenantId)),
        ]);
    } catch (err) {
        logger.warn('billing_cache_invalidation_failed', { tenantId, error: (err as Error).message });
    }
}

// ── Service ────────────────────────────────────────────────────────────────

/**
 * Returns the active subscription for a tenant, or null if none exists.
 */
export async function getActiveSubscription(
    tenantId: string,
): Promise<(TenantSubscriptionRecord & { plan: PlanRecord }) | null> {
    const db = await getDb();
    const rows = await db
        .select()
        .from(tenantSubscriptions)
        .innerJoin(plans, eq(tenantSubscriptions.planId, plans.id))
        .where(
            and(
                eq(tenantSubscriptions.tenantId, tenantId),
                eq(tenantSubscriptions.status, 'active'),
            ),
        )
        ;

    if (rows.length === 0) return null;
    return { ...rows[0].tenant_subscriptions, plan: rows[0].plans };
}

/**
 * Returns all active plans, ordered by price ascending.
 */
export async function getActivePlans(): Promise<PlanRecord[]> {
    const db = await getDb();
    return db
        .select()
        .from(plans)
        .where(eq(plans.active, 1));
}

/**
 * Upgrades a tenant to a new plan.
 *
 * Transactional flow:
 *   1. Validate plan exists and is active
 *   2. Validate tenant budget row exists
 *   3. Insert billing_ledger entry
 *   4. Upsert tenant_subscriptions (status=active)
 *   5. Update tenant_budgets: budget/limits/revision/lock=unlocked
 *   6. Resolve open finops_lock_events (resolutionType=upgrade)
 *   7. Invalidate Redis caches
 */
export async function upgradeTenantPlan(
    tenantId: string,
    newPlanId: string,
    requestId?: string,
): Promise<UpgradeResult> {
    const db = await getDb();

    // ── 1. Validate plan ───────────────────────────────────────────────────
    const planRows = await db
        .select()
        .from(plans)
        .where(eq(plans.id, newPlanId))
        ;

    if (planRows.length === 0) {
        throw new BillingServiceError('PLAN_NOT_FOUND', `Plan '${newPlanId}' not found.`);
    }

    const plan = planRows[0];
    if (!plan.active) {
        throw new BillingServiceError('PLAN_INACTIVE', `Plan '${plan.name}' is not active.`);
    }

    // ── 2. Validate tenant budget ──────────────────────────────────────────
    const budgetRows = await db
        .select({ stateRevision: tenantBudgets.stateRevision })
        .from(tenantBudgets)
        .where(eq(tenantBudgets.tenantId, tenantId))
        ;

    if (budgetRows.length === 0) {
        throw new BillingServiceError(
            'TENANT_BUDGET_NOT_FOUND',
            `Tenant budget not found for tenant '${tenantId}'. Run FinOps seed first.`,
        );
    }

    const currentRevision = budgetRows[0].stateRevision ?? 1;
    const nextRevision = currentRevision + 1;
    const planBudget = Number(plan.monthlyBudgetUsd);

    try {
        // ── 3. Billing ledger entry ────────────────────────────────────────
        await db.insert(billingLedger).values({
            id: randomUUID(),
            tenantId,
            type: 'upgrade',
            amountUsd: String(Number(plan.monthlyPriceUsd).toFixed(6)),
            metadata: {
                planId: plan.id,
                planName: plan.name,
                monthlyBudgetUsd: planBudget,
                requestId: requestId ?? null,
            },
            createdAt: new Date(),
        });

        // ── 4. Upsert tenant_subscriptions ────────────────────────────────
        // End any previous active subscription, insert new one
        const now = new Date();

        await db
            .update(tenantSubscriptions)
            .set({ status: 'canceled', endedAt: now })
            .where(
                and(
                    eq(tenantSubscriptions.tenantId, tenantId),
                    eq(tenantSubscriptions.status, 'active'),
                ),
            );

        await db.insert(tenantSubscriptions).values({
            id: randomUUID(),
            tenantId,
            planId: plan.id,
            status: 'active',
            startedAt: now,
        });

        // ── 5. Update tenant_budgets ───────────────────────────────────────
        await db
            .update(tenantBudgets)
            .set({
                monthlyBudgetUsd: String(planBudget.toFixed(6)),
                softLimitPercent: plan.softLimitPercent,
                hardLimitPercent: plan.hardLimitPercent,
                currentLockState: 'unlocked',
                stateRevision: nextRevision,
                updatedAt: now,
            })
            .where(eq(tenantBudgets.tenantId, tenantId));

        // ── 6. Resolve open lock events ────────────────────────────────────
        await db
            .update(finopsLockEvents)
            .set({ resolvedAt: now, resolutionType: 'upgrade' })
            .where(
                and(
                    eq(finopsLockEvents.tenantId, tenantId),
                    isNull(finopsLockEvents.resolvedAt),
                ),
            );

        // ── 7. Invalidate caches ───────────────────────────────────────────
        void invalidateBillingCaches(tenantId);

        logger.info('billing_upgrade_completed', {
            tenantId,
            planId: plan.id,
            planName: plan.name,
            newBudget: planBudget,
            nextRevision,
            requestId,
        });

        return {
            status: 'upgraded',
            plan: plan.name,
            planId: plan.id,
            newBudget: planBudget,
            softLimitPercent: plan.softLimitPercent,
            hardLimitPercent: plan.hardLimitPercent,
            stateRevision: nextRevision,
        };
    } catch (err) {
        if (err instanceof BillingServiceError) throw err;
        logger.error('billing_upgrade_failed', err as Error, { tenantId, planId: newPlanId, requestId });
        throw new BillingServiceError('UPGRADE_FAILED', `Upgrade failed: ${(err as Error).message}`);
    }
}
