import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { structuredLogger } from '@/infra/log/logger';
import { cleanupRetention } from '@/modules/jobs/cleanupRetention';

const ROUTE_PATH = '/api/cron/cleanup';

type CronAuthResult =
  | { ok: true; authMode: 'vercel-cron-header' | 'cron-token' }
  | { ok: false; reason: 'missing_credentials' | 'invalid_token' | 'missing_cron_token_env' };

function jsonWithRequestId(body: unknown, status: number, requestId: string): NextResponse {
  const response = NextResponse.json(body, { status });
  return attachRequestIdHeader(response, requestId);
}

function getRequestUrl(request: NextRequest): URL {
  return new URL(request.url);
}

function authorizeCron(request: NextRequest): CronAuthResult {
  if (request.headers.get('x-vercel-cron')?.trim() === '1') {
    return { ok: true, authMode: 'vercel-cron-header' };
  }

  const token = getRequestUrl(request).searchParams.get('token')?.trim();
  if (!token) {
    return { ok: false, reason: 'missing_credentials' };
  }

  const expected = process.env.CRON_TOKEN?.trim();
  if (!expected) {
    return { ok: false, reason: 'missing_cron_token_env' };
  }

  if (token !== expected) {
    return { ok: false, reason: 'invalid_token' };
  }

  return { ok: true, authMode: 'cron-token' };
}

async function handleCronCleanup(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);

  structuredLogger.info('cron_cleanup_start', {
    requestId,
    route: ROUTE_PATH,
    method: request.method,
    eventType: 'cron_job_start',
  });

  const auth = authorizeCron(request);
  if (!auth.ok) {
    const response = jsonWithRequestId({ error: 'UNAUTHORIZED_CRON' }, 401, requestId);
    structuredLogger.warn('cron_cleanup_unauthorized', {
      requestId,
      route: ROUTE_PATH,
      eventType: 'cron_job_end',
      durationMs: Date.now() - startedAt,
      status: 401,
      outcome: 'error',
      reason: auth.reason,
    });
    return response;
  }

  try {
    const result = await cleanupRetention({ requestId });
    const response = jsonWithRequestId(
      {
        ok: true,
        deleted: result.deleted,
        retentionDays: result.retentionDays,
      },
      200,
      requestId,
    );

    structuredLogger.info('cron_cleanup_end', {
      requestId,
      route: ROUTE_PATH,
      eventType: 'cron_job_end',
      authMode: auth.authMode,
      retentionDays: result.retentionDays,
      deletedTotal: result.deleted.total,
      durationMs: Date.now() - startedAt,
      status: 200,
      outcome: 'ok',
    });

    return response;
  } catch (error) {
    structuredLogger.error('cron_cleanup_failed', {
      requestId,
      route: ROUTE_PATH,
      eventType: 'cron_job_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.DB_ERROR,
      error,
    });
    return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Cleanup retention failed');
  }
}

async function _GET(request: NextRequest): Promise<NextResponse> {
  return handleCronCleanup(request);
}

async function _POST(request: NextRequest): Promise<NextResponse> {
  return handleCronCleanup(request);
}

export const GET = withGlobalErrorInterceptor(_GET);

export const POST = withGlobalErrorInterceptor(_POST);
