import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository } from '../../../../../../infra/repositories/tenant-ai-provider.repository';
import { checkRedisRateLimit } from '../../../../../../infra/rate-limit/redis-rate-limiter';
import {
  extractTenantIdFromTenantRoute,
  getAuthContext,
} from '../../../../../../infra/auth/tenant-route-guard';
import { attachRequestIdHeader, makeRequestId } from '../../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../../infra/log/logger';

export const runtime = 'nodejs';

async function enforceRateLimit(actorId: string, requestId: string, tenantId: string): Promise<NextResponse | null> {
  const result = await checkRedisRateLimit({
    tenantId,
    scope: `admin.ai-provider:${actorId}`,
    requestId,
  });

  if (!result.allowed) {
    return errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'rate_limited', { resetAt: result.resetAt });
  }

  return null;
}

async function _POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/tenants/[tenantId]/ai-provider/rotate-key';
  let tenantIdForLog: string | undefined;
  let userIdForLog: string | undefined;

  structuredLogger.info('tenant_ai_provider_rotate_key_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('tenant_ai_provider_rotate_key_end', {
      requestId,
      tenantId: tenantIdForLog,
      userId: userIdForLog,
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
    const tenantId = extractTenantIdFromTenantRoute(request);
    tenantIdForLog = tenantId;
    const guard = await getAuthContext(request, tenantId);
    if (!guard.ok) return finalize(guard.response);
    userIdForLog = guard.sessionUser.sub;
    if (guard.sessionUser.role !== 'admin') {
      return finalize(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), ErrorCode.FORBIDDEN);
    }

    const rateLimited = await enforceRateLimit(guard.sessionUser.sub, requestId, guard.tenantId);
    if (rateLimited) return finalize(rateLimited, ErrorCode.RATE_LIMITED);
    const payload = (await request.json()) as { apiKey?: string };

    if (!payload.apiKey) {
      return finalize(
        errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'apiKey is required'),
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await tenantAiProviderRepository.rotateApiKey(guard.tenantId, payload.apiKey);
    return finalize(NextResponse.json({ tenantId: guard.tenantId, rotated: true }));
  } catch (error) {
    structuredLogger.error('tenant_ai_provider_rotate_key_failed', {
      requestId,
      tenantId: tenantIdForLog,
      userId: userIdForLog,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: ErrorCode.VALIDATION_ERROR,
      error,
    });
    return finalize(
      errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, (error as Error).message),
      ErrorCode.VALIDATION_ERROR,
    );
  }
}

export const POST = withGlobalErrorInterceptor(_POST);
