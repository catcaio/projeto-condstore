export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import packageJson from '../../../../../package.json';
import { getDb } from '../../../../infra/db';
import { redisClient } from '../../../../infra/redis.client';
import { getRateLimiterFallbackMetrics } from '../../../../infra/security/rate-limiter';
import { requireInternalToken } from '../../../../infra/auth/tenant-route-guard';
import { makeRequestId, attachRequestIdHeader } from '../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { structuredLogger } from '../../../../infra/log/logger';
import { circuitBreaker } from '../../../../infra/security/circuit-breaker';

interface DiagStatus {
  env: string;
  git_sha: string | null;
  db: 'ok' | 'fail';
  redis: 'ok' | 'fail';
  uptimeSeconds: number;
  version: string;
  rateLimiterFallbackActive: { count: number; lastSeenAt: number | null };
  circuitBreakers: any[];
}

function detectGitSha(): string | null {
  const fromEnv =
    process.env.GIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim();
  return fromEnv || null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/internal/diag';

  structuredLogger.info('internal_diag_start', {
    requestId,
    route,
    eventType: 'internal_diag_start',
  });

  try {
    const authResult = requireInternalToken(request, { purpose: ['diag', 'export'] });
    if (!authResult.ok) return authResult.response;

    let dbStatus: DiagStatus['db'] = 'fail';
    let redisStatus: DiagStatus['redis'] = 'fail';

    try {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
    } catch (error) {
      structuredLogger.warn('internal_diag_db_fail', {
        requestId,
        route,
        eventType: 'internal_diag_db_check',
        errorCode: ErrorCode.DB_ERROR,
        error,
      });
    }

    try {
      const alive = await redisClient.ping();
      redisStatus = alive ? 'ok' : 'fail';
    } catch (error) {
      structuredLogger.warn('internal_diag_redis_fail', {
        requestId,
        route,
        eventType: 'internal_diag_redis_check',
        errorCode: ErrorCode.UNKNOWN,
        error,
      });
    }

    const payload: DiagStatus = {
      env: process.env.NODE_ENV ?? 'development',
      git_sha: detectGitSha(),
      db: dbStatus,
      redis: redisStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      version: packageJson.version,
      rateLimiterFallbackActive: getRateLimiterFallbackMetrics(),
      circuitBreakers: circuitBreaker.getStatus(),
    };

    const response = NextResponse.json(payload, { status: 200 });
    attachRequestIdHeader(response, requestId);

    structuredLogger.info('internal_diag_end', {
      requestId,
      route,
      eventType: 'internal_diag_end',
      durationMs: Date.now() - startedAt,
      outcome: 'ok',
      status: 200,
    });

    return response;
  } catch (error) {
    structuredLogger.error('internal_diag_unhandled', {
      requestId,
      route,
      eventType: 'internal_diag_error',
      errorCode: ErrorCode.UNKNOWN,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal diagnostics failed');
  }
}

