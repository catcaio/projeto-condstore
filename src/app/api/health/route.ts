/**
 * Health Check Endpoint.
 * Verifies database and Redis connectivity.
 * Returns structured JSON with individual check results.
 */

import { NextResponse } from 'next/server';
import { redisClient } from '../../../infra/redis.client';
import { logger } from '../../../infra/logger';

/**
 * Database diagnostic information.
 */
interface DatabaseDiagnostics {
    connected: boolean;
    databaseName?: string;
    tenantCount?: number;
    error?: string;
}

import { getDb } from '../../../infra/db';
import { sql } from 'drizzle-orm';

/**
 * Check database connectivity and gather diagnostics.
 */
async function checkDatabase(): Promise<DatabaseDiagnostics> {
    try {
        const db = await getDb();

        // Get database name (using raw query via drizzle)
        const [dbNameRows] = await db.execute<any>(sql`SELECT DATABASE() as db_name`);
        const databaseName = (dbNameRows as unknown as any[])[0]?.db_name || 'unknown';

        // Get tenant count
        const [countRows] = await db.execute<any>(sql`SELECT COUNT(*) as count FROM tenants`);
        const tenantCount = (countRows as unknown as any[])[0]?.count || 0;

        return {
            connected: true,
            databaseName,
            tenantCount,
        };
    } catch (error) {
        logger.error('Health check: DB connection failed', error as Error);
        return {
            connected: false,
            error: (error as Error).message,
        };
    }
}

/**
 * Check Redis connectivity.
 */
async function checkRedis(): Promise<boolean> {
    try {
        if (!redisClient.isAvailable()) {
            return false;
        }
        return await redisClient.ping();
    } catch (error) {
        logger.error('Health check: Redis connection failed', error as Error);
        return false;
    }
}

/**
 * GET /api/health
 * Returns system health status with database diagnostics.
 */
export async function GET() {
    const [dbDiagnostics, redisHealthy] = await Promise.all([
        checkDatabase(),
        checkRedis(),
    ]);

    const allHealthy = dbDiagnostics.connected && redisHealthy;

    const response = {
        status: allHealthy ? 'healthy' : 'degraded',
        checks: {
            db: dbDiagnostics.connected,
            redis: redisHealthy,
        },
        database: {
            name: dbDiagnostics.databaseName || null,
            tenantCount: dbDiagnostics.tenantCount ?? null,
            error: dbDiagnostics.error || null,
        },
        timestamp: new Date().toISOString(),
    };

    logger.info('Health check performed', {
        status: response.status,
        checks: response.checks,
        database: response.database,
    });

    return NextResponse.json(response, {
        status: allHealthy ? 200 : 503,
    });
}
