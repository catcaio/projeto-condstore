import { getDb } from '@/infra/db';
import { sql, and, gte, eq, desc } from 'drizzle-orm';
import { freightFunnelEvents, tenantBudgets, tenants, tenantSubscriptions, tenantEvents } from '@/drizzle/schema';
import { redisClient } from '@/infra/redis.client';
import { metricsRollupStatusRepository } from '@/modules/metrics/metrics-rollup-status.repository';

export async function getBillingSummary(tenantId: string) {
    try {
        const db = await getDb();

        // Attempt to get active subscription first
        const subResult = await db.select()
            .from(tenantSubscriptions)
            .where(and(eq(tenantSubscriptions.tenantId, tenantId), eq(tenantSubscriptions.status, 'active')))
            ;

        const sub = subResult[0];

        const budgetResult = await db.select({
            monthlyBudgetUsd: tenantBudgets.monthlyBudgetUsd,
            currentMonthUsd: tenantBudgets.currentMonthUsd,
            currentLockState: tenantBudgets.currentLockState,
            burnRatePerDay: tenantBudgets.burnRatePerDay,
        })
            .from(tenantBudgets)
            .where(eq(tenantBudgets.tenantId, tenantId))
            ;

        const budget = budgetResult[0] ?? {
            monthlyBudgetUsd: '0',
            currentMonthUsd: '0',
            currentLockState: 'unlocked',
            burnRatePerDay: '0',
        };

        // Fallback to tenants table if no subscription is present
        const tResult = await db.select({
            plan: tenants.plan,
            planStatus: tenants.planStatus,
        }).from(tenants).where(eq(tenants.id, tenantId));

        const tenant = tResult[0];

        return {
            planId: sub?.planId ?? tenant?.plan ?? 'FREE',
            status: sub?.status ?? tenant?.planStatus ?? 'active',
            currentPeriodEnd: sub?.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
            budget: {
                monthlyUsd: Number(budget.monthlyBudgetUsd),
                currentUsd: Number(budget.currentMonthUsd),
                state: budget.currentLockState,
                burnRate: Number(budget.burnRatePerDay),
            }
        };
    } catch (error) {
        console.error('getBillingSummary error:', error);
        return {
            planId: 'FREE',
            status: 'active',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            budget: {
                monthlyUsd: 0,
                currentUsd: 0,
                state: 'unlocked',
                burnRate: 0,
            }
        };
    }
}

export async function getUsageSummary(tenantId: string) {
    const db = await getDb();

    // Summing tokens from tenant_budgets or tenant_usage_metrics
    const tokensResult = await db.select({
        tokensConsumed: tenantBudgets.tokensConsumed,
        monthlyTokenLimit: tenantBudgets.monthlyTokenLimit,
        currentMonthUsd: tenantBudgets.currentMonthUsd,
        monthlyBudgetUsd: tenantBudgets.monthlyBudgetUsd,
    })
        .from(tenantBudgets)
        .where(eq(tenantBudgets.tenantId, tenantId))
        ;

    const tokens = tokensResult[0] ?? {
        tokensConsumed: 0,
        monthlyTokenLimit: 1000000,
        currentMonthUsd: '0',
        monthlyBudgetUsd: '0',
    };

    const percentUsedUsd = Number(tokens.monthlyBudgetUsd) > 0
        ? (Number(tokens.currentMonthUsd) / Number(tokens.monthlyBudgetUsd)) * 100
        : 0;

    const percentUsedTokens = tokens.monthlyTokenLimit > 0
        ? (tokens.tokensConsumed / tokens.monthlyTokenLimit) * 100
        : 0;

    return {
        tokensConsumed: tokens.tokensConsumed,
        monthlyTokenLimit: tokens.monthlyTokenLimit,
        percentUsedTokens,
        currentMonthUsd: Number(tokens.currentMonthUsd),
        monthlyBudgetUsd: Number(tokens.monthlyBudgetUsd),
        percentUsedUsd,
    };
}

export async function getFunnelSummary(tenantId: string) {
    const db = await getDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
        .select({
            stage: freightFunnelEvents.stage,
            count: sql<number>`count(*)`,
        })
        .from(freightFunnelEvents)
        .where(
            and(
                eq(freightFunnelEvents.tenantId, tenantId),
                gte(freightFunnelEvents.createdAt, sevenDaysAgo)
            )
        )
        .groupBy(freightFunnelEvents.stage);

    const counts: Record<string, number> = {
        'INTENT_DETECTED': 0,
        'ASKED_CEP': 0,
        'CEP_RECEIVED': 0,
        'QUOTE_SENT': 0,
        'ABANDONED': 0,
        'flow_started': 0,
        'cep_provided': 0,
        'freight_quoted': 0,
    };

    let total = 0;
    result.forEach((row) => {
        if (row.stage) {
            counts[row.stage] = Number(row.count ?? 0);
            total += Number(row.count ?? 0);
        }
    });

    counts['total'] = total;
    return counts;
}

export async function getSystemHealth(tenantId: string) {
    let dbOk = false;
    try {
        const db = await getDb();
        await db.execute(sql`SELECT 1 AS ok`);
        dbOk = true;
    } catch { }

    const redisOk = await redisClient.ping();
    const rollupStatus = await metricsRollupStatusRepository.getByTenant(tenantId);

    return {
        dbOk,
        redisOk,
        rollupOk: rollupStatus?.status === 'ok',
    };
}

export async function getRecentActivity(tenantId: string) {
    const db = await getDb();
    return db.select()
        .from(freightFunnelEvents)
        .where(eq(freightFunnelEvents.tenantId, tenantId))
        .orderBy(desc(freightFunnelEvents.createdAt))
        .limit(10);
}

export async function getActivationMilestones(tenantId: string) {
    const db = await getDb();
    const events = await db.select({ type: tenantEvents.type })
        .from(tenantEvents)
        .where(eq(tenantEvents.tenantId, tenantId));

    const set = new Set(events.map(e => e.type));
    return {
        signup_created: set.has('signup_created'),
        store_connected: set.has('store_connected'),
        first_freight_simulation: set.has('first_freight_simulation'),
        first_whatsapp_message: set.has('first_whatsapp_message'),
        cockpit_viewed: set.has('cockpit_viewed'),
    };
}
