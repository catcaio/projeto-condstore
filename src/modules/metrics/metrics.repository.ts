
import { sql, eq, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { simulations, type NewSimulationRecord } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { ErrorCode, InfrastructureError } from '../../infra/errors';

// Reuse DB connection logic (should specificially use singleton from infra/db or similar, 
// but sticking to repository pattern seen in simulation/message repos)
let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;
    if (!process.env.DATABASE_URL) {
        throw new InfrastructureError(ErrorCode.INTERNAL_ERROR, 'DATABASE_URL is not defined');
    }
    const connectionPool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });
    dbInstance = drizzle(connectionPool, { mode: 'default' });
    return dbInstance;
}

export interface FreightMetrics {
    totalQuotes: number;
    avgFreight: number;
    avgMargin: number;
    avgDurationMs: number; // Not stored in DB yet, maybe placeholder or assume 0
    topCarriers: { carrier: string; count: number }[];
    quotesToday: number;
    quotesThisMonth: number;
}

export class MetricsRepository {

    /**
     * Save a freight quote event (simulation).
     * Delegates to the simulations table.
     */
    async saveFreightQuoted(record: NewSimulationRecord): Promise<void> {
        if (!record.tenantId) {
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'tenant_id is required to save freight metric'
            );
        }
        const db = await getDb();
        await db.insert(simulations).values(record);
        logger.info('Freight quoted metric saved', { id: record.id, tenantId: record.tenantId });
    }

    /**
     * Get aggregated freight metrics for a tenant.
     */
    async getFreightMetrics(tenantId: string): Promise<FreightMetrics> {
        if (!tenantId) {
            throw new InfrastructureError(ErrorCode.INTERNAL_ERROR, 'tenant_id required');
        }

        const db = await getDb();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. General Averages & Total
        const [generalStats] = await db
            .select({
                count: sql<number>`count(*)`,
                avgPrice: sql<number>`avg(${simulations.bestPrice})`,
                avgMargin: sql<number>`avg(${simulations.bestMargin})`
            })
            .from(simulations)
            .where(eq(simulations.tenantId, tenantId));

        // 2. Quotes Today
        const [todayStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(sql`${simulations.tenantId} = ${tenantId} AND ${simulations.createdAt} >= ${today}`);

        // 3. Quotes This Month
        const [monthStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(sql`${simulations.tenantId} = ${tenantId} AND ${simulations.createdAt} >= ${firstDayOfMonth}`);

        // 4. Top Carriers
        const topCarriersResult = await db
            .select({
                carrier: simulations.bestCarrier,
                count: sql<number>`count(*)`
            })
            .from(simulations)
            .where(eq(simulations.tenantId, tenantId))
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
            avgDurationMs: 0, // Not captured in simulations table yet
            topCarriers,
            quotesToday: Number(todayStats?.count || 0),
            quotesThisMonth: Number(monthStats?.count || 0)
        };
    }
}

export const metricsRepository = new MetricsRepository();
