import { getDb } from '@/infra/db';
import { sql, eq, and, gte, desc } from 'drizzle-orm';
import {
    attributionClicks,
    publicEvents,
    freightSimulationLogs,
    freightFunnelEvents
} from '@/drizzle/schema';

export type AttributionSummaryRow = {
    key: string;
    clicks: number;
    sessions: number;
    simulations: number;
    started: number;
    completed: number;
    convRate: number;
};

export type GroupByParam = 'utmSource' | 'utmCampaign' | 'utmMedium';

export async function getAttributionSummary(
    tenantId: string,
    rangeDays: number,
    groupBy: GroupByParam,
    filters?: {
        source?: string;
        campaign?: string;
    }
): Promise<AttributionSummaryRow[]> {
    const db = await getDb();

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - rangeDays);

    // Drizzle schema access helper
    function getCol(table: any, col: GroupByParam) {
        if (col === 'utmSource') return table.utmSource;
        if (col === 'utmCampaign') return table.utmCampaign;
        if (col === 'utmMedium') return table.utmMedium;
        return table.utmSource;
    }

    // Map object to accumulate everything by grouping Key
    const map = new Map<string, AttributionSummaryRow>();

    const getOrInit = (key: string | null) => {
        const k = key || '(direct)/(none)';
        if (!map.has(k)) {
            map.set(k, {
                key: k,
                clicks: 0,
                sessions: 0,
                simulations: 0,
                started: 0,
                completed: 0,
                convRate: 0,
            });
        }
        return map.get(k)!;
    };

    // 1. Clicks
    try {
        const query = db.select({
            key: getCol(attributionClicks, groupBy),
            count: sql<number>`COUNT(*)`
        })
            .from(attributionClicks)
            .where(and(eq(attributionClicks.tenantId, tenantId), gte(attributionClicks.createdAt, maxDate)))
            .groupBy(getCol(attributionClicks, groupBy));

        const res = await query;
        for (const row of res) {
            getOrInit(row.key as string).clicks += Number(row.count) || 0;
        }
    } catch { }

    // 2. Events/Sessions (public_events)
    try {
        const query = db.select({
            key: getCol(publicEvents, groupBy),
            count: sql<number>`COUNT(DISTINCT ${publicEvents.anonId})`
        })
            .from(publicEvents)
            .where(and(eq(publicEvents.tenantId, tenantId), gte(publicEvents.createdAt, maxDate)))
            .groupBy(getCol(publicEvents, groupBy));

        const res = await query;
        for (const row of res) {
            getOrInit(row.key as string).sessions += Number(row.count) || 0;
        }
    } catch { }

    // 3. Simulations (freight_simulation_logs)
    try {
        const query = db.select({
            key: getCol(freightSimulationLogs, groupBy),
            count: sql<number>`COUNT(*)`
        })
            .from(freightSimulationLogs)
            .where(and(eq(freightSimulationLogs.tenantId, tenantId), gte(freightSimulationLogs.createdAt, maxDate)))
            .groupBy(getCol(freightSimulationLogs, groupBy));

        const res = await query;
        for (const row of res) {
            getOrInit(row.key as string).simulations += Number(row.count) || 0;
        }
    } catch { }

    // 4. Funnel events
    try {
        const query = db.select({
            key: getCol(freightFunnelEvents, groupBy),
            stage: freightFunnelEvents.stage,
            count: sql<number>`COUNT(*)`
        })
            .from(freightFunnelEvents)
            .where(and(eq(freightFunnelEvents.tenantId, tenantId), gte(freightFunnelEvents.createdAt, maxDate)))
            .groupBy(getCol(freightFunnelEvents, groupBy), freightFunnelEvents.stage);

        const res = await query;
        for (const row of res) {
            const rowRef = getOrInit(row.key as string);
            const count = Number(row.count) || 0;
            const stage = row.stage as string | null;

            if (stage === 'flow_started' || stage === 'INTENT_DETECTED') {
                rowRef.started += count;
            } else if (stage === 'freight_quoted' || stage === 'QUOTE_SENT') { // consider quote sent as completed for freight flow
                rowRef.completed += count;
            }
        }
    } catch { }

    // Build array, calculate conversion rates and sort
    const result = Array.from(map.values());

    for (const item of result) {
        if (item.started > 0) {
            item.convRate = Math.round((item.completed / item.started) * 100);
        }
    }

    // Default sort by simulations desc
    result.sort((a, b) => b.simulations - a.simulations);

    return result;
}
