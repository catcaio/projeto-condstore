import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { desc, eq, sql } from 'drizzle-orm';
import { simulations, type NewSimulationRecord, type SimulationRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { appConfig } from '../../config/app.config';
import { ErrorCode, InfrastructureError } from '../errors';

// Database connection singleton (lazy initialization)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    if (!process.env.DATABASE_URL) {
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'DATABASE_URL is not defined'
        );
    }

    const connectionPool = mysql.createPool(process.env.DATABASE_URL);
    dbInstance = drizzle(connectionPool, { mode: 'default' });

    // Verify connection (awaited, not fire-and-forget)
    try {
        const conn = await connectionPool.getConnection();
        logger.info('DB connected successfully');
        conn.release();
    } catch (err) {
        logger.error('DB connection failed', err as Error);
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Database connection verification failed',
            { error: (err as Error).message }
        );
    }

    return dbInstance;
}

export class SimulationRepository {
    /**
     * Save a simulation record.
     */
    async saveSimulation(record: NewSimulationRecord): Promise<void> {
        const db = await getDb();
        await db.insert(simulations).values(record);
        logger.info('Simulation saved', { id: record.id });
    }

    /**
     * Get recent simulations.
     */
    async getRecentSimulations(limit: number = 10): Promise<SimulationRecord[]> {
        const db = await getDb();
        return await db.select().from(simulations).orderBy(desc(simulations.createdAt)).limit(limit);
    }

    /**
     * Get basic operational metrics.
     */
    async getMetrics() {
        const db = await getDb();

        // Cast to any to avoid complex type issues with aggregations for now
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [result]: any[] = await db
            .select({
                totalSimulations: sql<number>`count(*)`,
                avgPrice: sql<number>`avg(${simulations.bestPrice})`,
                avgMargin: sql<number>`avg(${simulations.bestMargin})`,
            })
            .from(simulations);

        // Simple most used carrier query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const carrierResult: any[] = await db
            .select({
                carrier: simulations.bestCarrier,
                count: sql<number>`count(*)`
            })
            .from(simulations)
            .groupBy(simulations.bestCarrier)
            .orderBy(desc(sql`count(*)`))
            .limit(1);

        return {
            totalSimulations: Number(result?.totalSimulations || 0),
            avgFreightPrice: Number(result?.avgPrice || 0),
            avgMargin: Number(result?.avgMargin || 0),
            mostUsedCarrier: carrierResult[0]?.carrier || 'N/A'
        };
    }

    async countTotal(): Promise<number> {
        const db = await getDb();
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations);
        return Number(result?.count || 0);
    }

    async countToday(): Promise<number> {
        const db = await getDb();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(sql`${simulations.createdAt} >= ${today}`);
        return Number(result?.count || 0);
    }
}

export const simulationRepository = new SimulationRepository();
