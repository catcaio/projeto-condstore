
import { sql, eq, desc, and, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { simulations, type NewSimulationRecord } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { ErrorCode, InfrastructureError } from '../../infra/errors';
import { toZonedTime } from 'date-fns-tz';

import { getDb } from '../../infra/db';

// Removed local getDb implementation and dbInstance variable

export enum FreightEvent {
    REQUESTED = 'FREIGHT_QUOTE_REQUESTED',
    FAILED = 'FREIGHT_QUOTE_FAILED',
    QUOTED = 'FREIGHT_QUOTED',
}

export interface FreightMetrics {
    totalQuotes: number;
    avgFreight: number;
    avgMargin: number;
    avgDurationMs: number;
    topCarriers: { carrier: string; count: number }[];
    quotesToday: number;
    quotesThisMonth: number;
    daily?: { date: string; quotes: number; avgTicket: number }[];
}

const TIMEZONE = 'America/Sao_Paulo';

export class MetricsRepository {

    /**
     * Save a freight event (simulation).
     * Uses idempotencyKey for QUOTED events to prevent duplicates.
     */
    async saveFreightEvent(record: NewSimulationRecord): Promise<void> {
        if (!record.tenantId) {
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'tenant_id is required to save freight metric'
            );
        }

        const db = await getDb();

        try {
            await db.insert(simulations).values(record);

            logger.info('Freight metric saved', {
                id: record.id,
                tenantId: record.tenantId,
                event: record.event
            });

        } catch (err: any) {
            // Handle duplicate entry for idempotency key
            // MySQL: code='ER_DUP_ENTRY', errno=1062, sqlState='23000'
            if ((err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || err.sqlState === '23000' || err.message?.includes('Duplicate entry')) && record.idempotencyKey) {
                logger.warn('Freight metric skipped (idempotent)', {
                    idempotencyKey: record.idempotencyKey,
                    tenantId: record.tenantId
                });
                return;
            }
            // Handle Drizzle error wrapper if needed, but usually it throws the driver error
            throw err;
        }
    }

    // Legacy support alias if needed, or better just use saveFreightEvent
    async saveFreightQuoted(record: NewSimulationRecord): Promise<void> {
        return this.saveFreightEvent({ ...record, event: FreightEvent.QUOTED });
    }

    /**
     * Get aggregated freight metrics for a tenant.
     * Respects Sao Paulo timezone for Today/Month stats.
     */
    async getFreightMetrics(tenantId: string): Promise<FreightMetrics> {
        if (!tenantId) {
            throw new InfrastructureError(ErrorCode.INTERNAL_ERROR, 'tenant_id required');
        }

        const db = await getDb();

        // Timezone Logic: We want to match records where the *local Sao Paulo time* of creation matches today/this month.
        // Since DB stores in UTC (presumably), we convert the stored UTC time to Sao Paulo time -> then extract date.
        // MySQL `CONVERT_TZ` is the standard way. 
        // We assume DB server has timezone info or we pass offsets. 
        // Safest is to use offsets: 'America/Sao_Paulo' is roughly -03:00 (ignoring DST which Brazil abolished mostly, but good to be careful).
        // Actually, explicit offsets are safer if we don't know if named timezones are loaded in TiDB/MySQL.
        // Sao Paulo is UTC-3.

        const tzOffset = '-03:00';

        const quotedFilter = eq(simulations.event, FreightEvent.QUOTED);

        // 1. General Averages & Total
        const [generalStats] = await db
            .select({
                count: sql<number>`count(*)`,
                avgPrice: sql<number>`avg(${simulations.bestPrice})`,
                avgMargin: sql<number>`avg(${simulations.bestMargin})`
            })
            .from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), quotedFilter));

        // 2. Quotes Today (in SP)
        const [todayStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(sql`${simulations.tenantId} = ${tenantId} 
                      AND ${simulations.event} = ${FreightEvent.QUOTED}
                      AND DATE(CONVERT_TZ(${simulations.createdAt}, '+00:00', ${tzOffset})) = DATE(CONVERT_TZ(NOW(), '+00:00', ${tzOffset}))`);

        // 3. Quotes This Month (in SP)
        const [monthStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(sql`${simulations.tenantId} = ${tenantId} 
                      AND ${simulations.event} = ${FreightEvent.QUOTED}
                      AND DATE_FORMAT(CONVERT_TZ(${simulations.createdAt}, '+00:00', ${tzOffset}), '%Y-%m') = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', ${tzOffset}), '%Y-%m')`);

        // 4. Top Carriers
        const topCarriersResult = await db
            .select({
                carrier: simulations.bestCarrier,
                count: sql<number>`count(*)`
            })
            .from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), quotedFilter))
            .groupBy(simulations.bestCarrier)
            .orderBy(desc(sql`count(*)`))
            .limit(3);

        const topCarriers = topCarriersResult.map((row: any) => ({
            carrier: row.carrier || 'Unknown',
            count: Number(row.count)
        }));

        return {
            totalQuotes: Number(generalStats?.count || 0),
            avgFreight: Number(generalStats?.avgPrice || 0),
            avgMargin: Number(generalStats?.avgMargin || 0),
            avgDurationMs: 0,
            topCarriers,
            quotesToday: Number(todayStats?.count || 0),
            quotesThisMonth: Number(monthStats?.count || 0)
        };
    }

    async getFreightTimeseries(tenantId: string, range: '7d' | '30d'): Promise<any> {
        if (!tenantId) throw new InfrastructureError(ErrorCode.INTERNAL_ERROR, 'tenant_id required');

        const db = await getDb();
        const tzOffset = '-03:00';
        const limitDays = range === '30d' ? 30 : 7;

        // Group by Date(SP Time)
        const result = await db.execute(sql`
            SELECT 
                DATE(CONVERT_TZ(created_at, '+00:00', ${tzOffset})) as date,
                COUNT(*) as count,
                AVG(best_price) as avgTicket
            FROM simulations
            WHERE tenant_id = ${tenantId}
              AND event = ${FreightEvent.QUOTED}
              AND created_at >= DATE_SUB(NOW(), INTERVAL ${limitDays} DAY)
            GROUP BY DATE(CONVERT_TZ(created_at, '+00:00', ${tzOffset}))
            ORDER BY date ASC
        `);

        // Drizzle execute returns [rows, fields]
        const rows = result[0] as unknown as any[];

        return {
            range,
            daily: rows.map(r => ({
                date: r.date, // YYYY-MM-DD
                quotes: Number(r.count),
                avgTicket: Number(r.avgTicket)
            }))
        };
    }
}

export const metricsRepository = new MetricsRepository();
