import { getDb } from '@/infra/db';
import { sql, and, gte, eq, desc } from 'drizzle-orm';
import { freightFunnelEvents, tenantBudgets, tenants } from '@/drizzle/schema';
import { redisClient } from '@/infra/redis.client';
import { metricsRollupStatusRepository } from '@/modules/metrics/metrics-rollup-status.repository';

export async function getBillingSummary(tenantId: string) {
    const db = await getDb();
    const result = await db.execute(sql`
        SELECT
            current_lock_state as state,
            monthly_budget_usd as monthlyBudgetUsd,
            current_month_usd as currentMonthUsd,
            burn_rate_per_day as burnRatePerDay
        FROM tenant_budgets
        WHERE tenant_id = ${tenantId}
        LIMIT 1
    `);
    const rows = (Array.isArray(result) ? result[0] : result) as unknown as any[];
    return rows[0] ?? {
        state: 'unlocked',
        monthlyBudgetUsd: 0,
        currentMonthUsd: 0,
        burnRatePerDay: 0,
    };
}

export async function getUsageSummary(tenantId: string) {
    const db = await getDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db.execute(sql`
        SELECT 
            COUNT(*) as total_simulations,
            AVG(peso_total) as avg_peso
        FROM freight_funnel_events
        WHERE tenant_id = ${tenantId} AND created_at >= ${sevenDaysAgo} AND stage = 'flow_started'
    `);
    const rows = (Array.isArray(result) ? result[0] : result) as unknown as any[];
    return rows[0] ?? {
        total_simulations: 0,
        avg_peso: 0,
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
        flow_started: 0,
        cep_provided: 0,
        freight_quoted: 0,
    };

    result.forEach((row) => {
        if (row.stage && (row.stage in counts)) {
            counts[row.stage] = Number(row.count ?? 0);
        }
    });

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
        .limit(5);
}
