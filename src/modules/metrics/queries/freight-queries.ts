/**
 * Queries oficiais de métricas de frete (issue #396).
 *
 * Única fonte reutilizável para: `GET /api/metrics/freight`,
 * `GET /api/metrics/freight/timeseries` e `GET /api/cockpit/metrics/freight`.
 * Rotas são apresentação (auth/cache/logs) e não recalculam KPIs.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { metricsRepository, type FreightMetrics } from '../metrics.repository';
import { METRICS_TZ_OFFSET, getRollingWindowStart } from '../timezone';
import {
    buildAttributionBreakdown,
    isAttributionGroupBy,
    parseAttributionGroupBy,
    unwrapRows,
} from '../attribution-breakdown';
import type { AttributionGroupBy } from '@/infra/attribution/attribution.types';

export type FreightTimeseriesRange = '7d' | '30d';

export interface FreightSimulationLogsResult {
    total_simulations_7d: number;
    top_ufs_7d: Array<{ uf: string; count: number }>;
    avg_valor_by_uf_7d: Array<{ uf: string; avg_valor: number }>;
    avg_peso_7d: number;
    avg_prazo_by_uf_7d: Array<{ uf: string; avg_prazo: number }>;
    daily_14d: Array<{ date: string; count: number }>;
    attribution_breakdown_7d?: {
        groupBy: 'utm_source' | 'utm_campaign';
        buckets: Array<{ key: string; count: number }>;
    };
}

function requireTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
        throw new Error('tenant_id is required');
    }
}

/** Query oficial `freight.*` (fonte: `simulations`, timezone America/Sao_Paulo). */
export async function getFreightKpis(tenantId: string): Promise<FreightMetrics> {
    requireTenant(tenantId);
    return metricsRepository.getFreightMetrics(tenantId);
}

/** Query oficial `freight.timeseries` (fonte: `simulations`). */
export async function getFreightTimeseries(tenantId: string, range: FreightTimeseriesRange) {
    requireTenant(tenantId);
    return metricsRepository.getFreightTimeseries(tenantId, range);
}

/**
 * Query oficial `freight_logs.*` (fonte: `freight_simulation_logs`).
 *
 * Contrato temporal: janelas móveis (7d/14d) como instantes absolutos
 * calculados em app a partir de um único `now`; agrupamento diário por
 * data-calendário America/Sao_Paulo via CONVERT_TZ. O SQL nunca usa
 * NOW()/UTC_TIMESTAMP().
 */
export async function getFreightSimulationLogs(
    tenantId: string,
    groupByInput?: string | null,
    now: Date = new Date(),
): Promise<FreightSimulationLogsResult> {
    requireTenant(tenantId);
    const parsedGroupBy = parseAttributionGroupBy(groupByInput ?? null);
    const groupBy: AttributionGroupBy | null = isAttributionGroupBy(parsedGroupBy) ? parsedGroupBy : null;

    const last7d = getRollingWindowStart(now, 7);
    const last14d = getRollingWindowStart(now, 14);

    const db = await getDb();

    const [totalResult, topUfsResult, avgValorByUfResult, avgPesoResult, avgPrazoByUfResult, dailyResult, attributionBreakdownResult] =
        await Promise.all([
            db.execute(sql`
          SELECT COUNT(*) AS total
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last7d}
        `),
            db.execute(sql`
          SELECT uf, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last7d}
          GROUP BY uf
          ORDER BY count DESC, uf ASC
        `),
            db.execute(sql`
          SELECT uf, AVG(valor) AS avg_valor
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last7d}
          GROUP BY uf
          ORDER BY uf ASC
        `),
            db.execute(sql`
          SELECT AVG(peso) AS avg_peso
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last7d}
        `),
            db.execute(sql`
          SELECT uf, AVG(prazo) AS avg_prazo
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last7d}
          GROUP BY uf
          ORDER BY uf ASC
        `),
            db.execute(sql`
          SELECT DATE(CONVERT_TZ(created_at, '+00:00', ${METRICS_TZ_OFFSET})) AS date, COUNT(*) AS count
          FROM freight_simulation_logs
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${last14d}
          GROUP BY DATE(CONVERT_TZ(created_at, '+00:00', ${METRICS_TZ_OFFSET}))
          ORDER BY date ASC
        `),
            groupBy
                ? db.execute(
                    groupBy === 'utm_campaign'
                        ? sql`
                    SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM freight_simulation_logs
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= ${last7d}
                    GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `
                        : sql`
                    SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM freight_simulation_logs
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= ${last7d}
                    GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `,
                )
                : Promise.resolve(null),
        ]);

    const totalRows = unwrapRows<{ total: number | string }>(totalResult);
    const topUfsRows = unwrapRows<{ uf: string; count: number | string }>(topUfsResult);
    const avgValorRows = unwrapRows<{ uf: string; avg_valor: number | string | null }>(avgValorByUfResult);
    const avgPesoRows = unwrapRows<{ avg_peso: number | string | null }>(avgPesoResult);
    const avgPrazoRows = unwrapRows<{ uf: string; avg_prazo: number | string | null }>(avgPrazoByUfResult);
    const dailyRows = unwrapRows<{ date: string | Date; count: number | string }>(dailyResult);

    const payload: FreightSimulationLogsResult = {
        total_simulations_7d: Number(totalRows[0]?.total ?? 0),
        top_ufs_7d: topUfsRows.map((row) => ({ uf: row.uf, count: Number(row.count) })),
        avg_valor_by_uf_7d: avgValorRows.map((row) => ({ uf: row.uf, avg_valor: Number(row.avg_valor ?? 0) })),
        avg_peso_7d: Number(avgPesoRows[0]?.avg_peso ?? 0),
        avg_prazo_by_uf_7d: avgPrazoRows.map((row) => ({ uf: row.uf, avg_prazo: Number(row.avg_prazo ?? 0) })),
        daily_14d: dailyRows.map((row) => ({
            date: typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 10),
            count: Number(row.count),
        })),
    };

    if (groupBy && attributionBreakdownResult) {
        payload.attribution_breakdown_7d = buildAttributionBreakdown(
            groupBy,
            unwrapRows<{ bucket: string | null; count: number | string | null }>(attributionBreakdownResult),
        );
    }

    return payload;
}
