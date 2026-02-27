/**
 * ecosystem-map.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Todas as queries do Frank Supremo Ecosystem Map, executadas em paralelo.
 * read-only, cross-tenant, zero mutações.
 */

import { sql, desc, eq, gte, count } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import {
    tenants,
    tenantBudgets,
    finopsLockEvents,
    webhookEvents,
    tokenUsageEvents,
} from '../../drizzle/schema';
import { getStreamLag, getDLQCount } from '../events/event-metrics';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TopBurnItem {
    tenantId: string;
    burnRatePerDay: number;
    percentUsed: number;
}

export interface EcosystemMap {
    collectedAt: string;
    tenants: {
        total: number;
        activeLast24h: number;
    };
    finops: {
        locked: number;
        degraded: number;
        preemptive: number;
        topBurn: TopBurnItem[];
    };
    webhooks: {
        lag: number;
        dlq: number;
        failed24h: number;
    };
    events: {
        finopsDLQ: number;
        webhookDLQ: number;
    };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function safeNumber(val: unknown): number {
    const n = Number(val);
    return isFinite(n) ? n : 0;
}

// ── Queries ────────────────────────────────────────────────────────────────

async function queryTenants(): Promise<{ total: number; activeLast24h: number }> {
    const db = await getDb();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalResult, activeResult] = await Promise.all([
        // Total tenants
        db.select({ count: sql<number>`COUNT(*)` }).from(tenants),
        // Active: tenants that had token usage events in the last 24h
        db
            .select({ count: sql<number>`COUNT(DISTINCT ${tokenUsageEvents.tenantId})` })
            .from(tokenUsageEvents)
            .where(gte(tokenUsageEvents.createdAt, since)),
    ]);

    return {
        total: safeNumber(totalResult[0]?.count),
        activeLast24h: safeNumber(activeResult[0]?.count),
    };
}

async function queryFinOps(): Promise<{
    locked: number;
    degraded: number;
    preemptive: number;
    topBurn: TopBurnItem[];
}> {
    const db = await getDb();

    const [lockCounts, topBurnRaw] = await Promise.all([
        // Count by lock state
        db
            .select({
                state: tenantBudgets.currentLockState,
                count: sql<number>`COUNT(*)`,
            })
            .from(tenantBudgets)
            .groupBy(tenantBudgets.currentLockState),

        // Top 5 burn rate
        db
            .select({
                tenantId: tenantBudgets.tenantId,
                burnRatePerDay: tenantBudgets.burnRatePerDay,
                currentMonthUsd: tenantBudgets.currentMonthUsd,
                monthlyBudgetUsd: tenantBudgets.monthlyBudgetUsd,
            })
            .from(tenantBudgets)
            .where(sql`${tenantBudgets.burnRatePerDay} IS NOT NULL AND ${tenantBudgets.burnRatePerDay} > 0`)
            .orderBy(desc(tenantBudgets.burnRatePerDay))
            .limit(5),
    ]);

    let locked = 0;
    let degraded = 0;
    let preemptive = 0;

    for (const row of lockCounts) {
        const n = safeNumber(row.count);
        if (row.state === 'locked') locked = n;
        else if (row.state === 'degraded') degraded = n;
        else if (row.state === 'preemptive') preemptive = n;
    }

    const topBurn: TopBurnItem[] = topBurnRaw.map((row) => {
        const burn = safeNumber(row.burnRatePerDay);
        const current = safeNumber(row.currentMonthUsd);
        const budget = safeNumber(row.monthlyBudgetUsd);
        const percentUsed = budget > 0 ? Math.min(100, Math.round((current / budget) * 100)) : 0;
        return { tenantId: row.tenantId, burnRatePerDay: burn, percentUsed };
    });

    return { locked, degraded, preemptive, topBurn };
}

async function queryWebhooks(): Promise<{ lag: number; dlq: number; failed24h: number }> {
    const WEBHOOK_STREAM = 'events:webhook';
    const WEBHOOK_GROUP = 'webhook-group';

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lagResult, dlqResult, failedResult] = await Promise.allSettled([
        getStreamLag(WEBHOOK_STREAM, WEBHOOK_GROUP),
        getDLQCount(WEBHOOK_STREAM),
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(webhookEvents)
                .where(
                    sql`${webhookEvents.status} = 'failed' AND ${webhookEvents.receivedAt} >= ${since}`
                );
            return safeNumber(rows[0]?.count);
        })(),
    ]);

    const lag = lagResult.status === 'fulfilled' ? safeNumber(lagResult.value?.pending) : 0;
    const dlq = dlqResult.status === 'fulfilled' ? safeNumber(dlqResult.value?.dlqCount) : 0;
    const failed = failedResult.status === 'fulfilled' ? failedResult.value : 0;

    return { lag, dlq, failed24h: failed };
}

async function queryEventsDLQ(): Promise<{ finopsDLQ: number; webhookDLQ: number }> {
    const [finopsDLQResult, webhookDLQResult] = await Promise.allSettled([
        getDLQCount('events:finops'),
        getDLQCount('events:webhook'),
    ]);

    return {
        finopsDLQ: finopsDLQResult.status === 'fulfilled' ? safeNumber(finopsDLQResult.value?.dlqCount) : 0,
        webhookDLQ: webhookDLQResult.status === 'fulfilled' ? safeNumber(webhookDLQResult.value?.dlqCount) : 0,
    };
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function getEcosystemMap(): Promise<EcosystemMap> {
    const [tenantsData, finopsData, webhooksData, eventsData] = await Promise.all([
        queryTenants(),
        queryFinOps(),
        queryWebhooks(),
        queryEventsDLQ(),
    ]);

    return {
        collectedAt: new Date().toISOString(),
        tenants: tenantsData,
        finops: finopsData,
        webhooks: webhooksData,
        events: eventsData,
    };
}
