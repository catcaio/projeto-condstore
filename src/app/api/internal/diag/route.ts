export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../infra/auth/tenant-route-guard';
import { makeRequestId, attachRequestIdHeader } from '../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { structuredLogger } from '../../../../infra/log/logger';
import { collectInternalDiagSnapshot } from '../../../../infra/diagnostics/internal-diag';

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

    const snapshot = await collectInternalDiagSnapshot();

    const payload: DiagStatus = {
      env: snapshot.env,
      git_sha: snapshot.gitSha,
      db: snapshot.db,
      redis: snapshot.redis,
      uptimeSeconds: snapshot.uptimeSeconds,
      version: snapshot.version,
      rateLimiterFallbackActive: snapshot.rateLimiterFallbackActive,
      circuitBreakers: snapshot.circuitBreakers as any[],
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

