import packageJson from '../../../package.json';
import { sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';
import { getRateLimiterFallbackMetrics } from '@/infra/security/rate-limiter';
import { circuitBreaker } from '@/infra/security/circuit-breaker';

export interface InternalDiagSnapshot {
    env: string;
    gitSha: string | null;
    db: 'ok' | 'fail';
    redis: 'ok' | 'fail';
    uptimeSeconds: number;
    version: string;
    rateLimiterFallbackActive: { count: number; lastSeenAt: number | null };
    circuitBreakers: unknown[];
}

export function detectGitSha(): string | null {
    const fromEnv =
        process.env.GIT_SHA?.trim() ||
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        process.env.COMMIT_SHA?.trim();

    return fromEnv || null;
}

export async function collectInternalDiagSnapshot(): Promise<InternalDiagSnapshot> {
    let dbStatus: InternalDiagSnapshot['db'] = 'fail';
    let redisStatus: InternalDiagSnapshot['redis'] = 'fail';

    try {
        const db = await getDb();
        await db.execute(sql`SELECT 1`);
        dbStatus = 'ok';
    } catch {
        dbStatus = 'fail';
    }

    try {
        const alive = await redisClient.ping();
        redisStatus = alive ? 'ok' : 'fail';
    } catch {
        redisStatus = 'fail';
    }

    return {
        env: process.env.NODE_ENV ?? 'development',
        gitSha: detectGitSha(),
        db: dbStatus,
        redis: redisStatus,
        uptimeSeconds: Math.floor(process.uptime()),
        version: packageJson.version,
        rateLimiterFallbackActive: getRateLimiterFallbackMetrics(),
        circuitBreakers: circuitBreaker.getStatus(),
    };
}
