/**
 * Health Check Endpoint.
 * Verifies database and Redis connectivity.
 * Returns structured JSON with individual check results.
 */

import { NextResponse } from 'next/server';
import { redisClient } from '../../../infra/redis.client';
import { logger } from '../../../infra/logger';

/**
 * Check database connectivity with a lightweight query.
 */
async function checkDatabase(): Promise<boolean> {
    try {
        if (!process.env.DATABASE_URL) {
            return false;
        }

        // Dynamic import to avoid loading MySQL driver at module level
        const mysql = await import('mysql2/promise');
        const connection = await mysql.default.createConnection(process.env.DATABASE_URL);
        await connection.execute('SELECT 1');
        await connection.end();
        return true;
    } catch (error) {
        logger.error('Health check: DB connection failed', error as Error);
        return false;
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
 * Returns system health status.
 */
export async function GET() {
    const [dbHealthy, redisHealthy] = await Promise.all([
        checkDatabase(),
        checkRedis(),
    ]);

    const allHealthy = dbHealthy && redisHealthy;

    const response = {
        status: allHealthy ? 'healthy' : 'degraded',
        checks: {
            db: dbHealthy,
            redis: redisHealthy,
        },
        timestamp: new Date().toISOString(),
    };

    logger.info('Health check performed', {
        status: response.status,
        checks: response.checks,
    });

    return NextResponse.json(response, {
        status: allHealthy ? 200 : 503,
    });
}
