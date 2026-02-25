import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { getDb } from '../../../../../infra/db';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { logger } from '../../../../../infra/logger';
import { redisClient } from '../../../../../infra/redis.client';
import { tenantRepository } from '../../../../../infra/repositories/tenant.repository';
import { normalizeTenantTimeZone } from '../../../../../infra/time/window';
import { metricsRollupStatusRepository } from '../../../../../modules/metrics/metrics-rollup-status.repository';

export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 15;

interface OpsStatusPayload {
  tenantId: string;
  timezone: string;
  rollup_status: {
    last_day_processed: string | null;
    last_run_at: Date | null;
    last_duration_ms: number | null;
    last_rows_written: number | null;
    status: 'ok' | 'error';
    last_error_code: string | null;
  } | null;
  db_ok: boolean;
  redis_ok: boolean;
}

function cacheKey(tenantId: string): string {
  return `cockpit:ops:status:${tenantId}`;
}

function toPayload(input: {
  tenantId: string;
  timezone: string;
  dbOk: boolean;
  redisOk: boolean;
  status: Awaited<ReturnType<typeof metricsRollupStatusRepository.getByTenant>>;
}): OpsStatusPayload {
  const row = input.status;
  return {
    tenantId: input.tenantId,
    timezone: input.timezone,
    db_ok: input.dbOk,
    redis_ok: input.redisOk,
    rollup_status: row ? {
      last_day_processed: row.lastDayProcessed ?? null,
      last_run_at: row.lastRunAt ?? null,
      last_duration_ms: row.lastDurationMs ?? null,
      last_rows_written: row.lastRowsWritten ?? null,
      status: row.status,
      last_error_code: row.lastErrorCode ?? null,
    } : null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/cockpit/ops/status';
  let tenantId: string | undefined;

  structuredLogger.info('cockpit_ops_status_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('cockpit_ops_status_end', {
      requestId,
      tenantId,
      route,
      eventType: 'route_end',
      durationMs: Date.now() - startedAt,
      status: response.status,
      outcome: response.status >= 400 ? 'error' : 'ok',
      errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
    });
    return response;
  };

  try {
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return finalize(auth.response, auth.code);

    tenantId = auth.session.tenantId;
    const key = cacheKey(tenantId);

    if (redisClient.isAvailable()) {
      const cached = await redisClient.get<OpsStatusPayload>(key);
      if (cached) {
        return finalize(NextResponse.json(cached, {
          status: 200,
          headers: {
            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
            'X-Cache': 'HIT',
          },
        }));
      }
    }

    const redisOk = await redisClient.ping();

    let dbOk = false;
    const db = await getDb();
    await db.execute(sql`SELECT 1 AS ok`);
    dbOk = true;

    const tenant = await tenantRepository.getTenantById(tenantId);
    if (!tenant) {
      return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Tenant not found'), ErrorCode.VALIDATION_ERROR);
    }

    const status = await metricsRollupStatusRepository.getByTenant(tenantId);
    const payload = toPayload({
      tenantId,
      timezone: normalizeTenantTimeZone(tenant.timezone),
      dbOk,
      redisOk,
      status,
    });

    if (redisClient.isAvailable()) {
      redisClient.set(key, payload, CACHE_TTL_SECONDS).catch(() => undefined);
    }

    return finalize(NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
        'X-Cache': 'MISS',
      },
    }));
  } catch (error) {
    logger.error('cockpit/ops/status failed', error as Error, { tenantId });
    structuredLogger.error('cockpit_ops_status_failed', {
      requestId,
      tenantId,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.DB_ERROR,
      error,
    });
    return finalize(
      errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load ops status'),
      ErrorCode.DB_ERROR,
    );
  }
}
