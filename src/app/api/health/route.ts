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

/**
 * Check database connectivity and gather diagnostics.
 */
async function checkDatabase(): Promise<DatabaseDiagnostics> {
    try {
        if (!process.env.DATABASE_URL) {
            return { connected: false, error: 'DATABASE_URL not configured' };
        }

        // Dynamic import to avoid loading MySQL driver at module level
        const mysql = await import('mysql2/promise');
        const connection = await mysql.default.createConnection({
            uri: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: true,
            },
        });

        // Get database name
        const [dbNameRows] = await connection.execute<any[]>('SELECT DATABASE() as db_name');
        const databaseName = dbNameRows[0]?.db_name || 'unknown';

        // Get tenant count
        const [countRows] = await connection.execute<any[]>('SELECT COUNT(*) as count FROM tenants');
        const tenantCount = countRows[0]?.count || 0;

        await connection.end();

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
    // Security: Only allow in development
    const isDev = process.env.NODE_ENV === 'development';

    // Simple protection for health check in non-dev
    if (!isDev) {
        return NextResponse.json(
            { status: 'ok', service: 'lojacond-frete-automacao' }, // Minimal info in prod
            { status: 200 }
        );
    }

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
