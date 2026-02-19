/**
 * Health Check Endpoint.
 * Verifies database and Redis connectivity.
 *
 * Public response: minimal status only (no internal details).
 * Detailed response: only when a valid HEALTHCHECK_TOKEN is provided
 * via the `x-health-token` request header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '../../../infra/redis.client';
import { logger } from '../../../infra/logger';
import { getDb } from '../../../infra/db';
import { sql } from 'drizzle-orm';

interface DatabaseDiagnostics {
    connected: boolean;
    error?: string;
}

async function checkDatabase(): Promise<DatabaseDiagnostics> {
    try {
        const db = await getDb();
        // Simple connectivity probe — no sensitive data returned
        await db.execute(sql`SELECT 1`);
        return { connected: true };
    } catch (error) {
        logger.error('Health check: DB connection failed', error as Error);
        return { connected: false, error: 'DB unreachable' };
    }
}

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
 */
export async function GET(request: NextRequest) {
    const [dbDiagnostics, redisHealthy] = await Promise.all([
        checkDatabase(),
        checkRedis(),
    ]);

    const allHealthy = dbDiagnostics.connected && redisHealthy;
    const status = allHealthy ? 'healthy' : 'degraded';
    const httpStatus = allHealthy ? 200 : 503;

    logger.info('Health check performed', { status, db: dbDiagnostics.connected, redis: redisHealthy });

    // Detailed diagnostics only for authenticated callers with HEALTHCHECK_TOKEN.
    const expectedToken = process.env.HEALTHCHECK_TOKEN;
    const providedToken = request.headers.get('x-health-token');

    if (expectedToken && providedToken === expectedToken) {
        return NextResponse.json(
            {
                status,
                checks: { db: dbDiagnostics.connected, redis: redisHealthy },
                database: { connected: dbDiagnostics.connected, error: dbDiagnostics.error ?? null },
                timestamp: new Date().toISOString(),
            },
            { status: httpStatus }
        );
    }

    // Public callers: status + timestamp only.
    return NextResponse.json({ status, timestamp: new Date().toISOString() }, { status: httpStatus });
}
