import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository, type UpsertTenantAIProviderInput } from '../../../../../infra/repositories/tenant-ai-provider.repository';
import { checkRedisRateLimit } from '../../../../../infra/rate-limit/redis-rate-limiter';
import {
  extractTenantIdFromTenantRoute,
  getAuthContext,
} from '../../../../../infra/auth/tenant-route-guard';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';

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

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

async function _GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/tenants/[tenantId]/ai-provider';
  let tenantIdForLog: string | undefined;
  let userIdForLog: string | undefined;

  structuredLogger.info('tenant_ai_provider_get_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('tenant_ai_provider_get_end', {
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
    const config = await tenantAiProviderRepository.getProviderConfig(guard.tenantId);

    if (!config) {
      return finalize(NextResponse.json({ tenantId: guard.tenantId, configured: false }, { status: 404 }));
    }

    return finalize(NextResponse.json({
      tenantId: guard.tenantId,
      configured: true,
      providerType: config.providerType,
      baseUrl: config.baseUrl,
      model: config.model,
      embedModel: config.embedModel,
      isEnabled: config.isEnabled === 1,
      hasApiKey: Boolean(config.apiKeyEncrypted),
      timeoutMs: config.timeoutMs,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  } catch (error) {
    structuredLogger.error('tenant_ai_provider_get_failed', {
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

async function _PUT(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/tenants/[tenantId]/ai-provider';
  let tenantIdForLog: string | undefined;
  let userIdForLog: string | undefined;

  structuredLogger.info('tenant_ai_provider_put_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('tenant_ai_provider_put_end', {
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
    const payload = (await request.json()) as Partial<UpsertTenantAIProviderInput> & {
      isEnabled?: boolean | string;
    };

    const isEnabled = toBoolean(payload.isEnabled);
    const embedModel = payload.embedModel || payload.model;

    if (!payload.providerType || !payload.baseUrl || !payload.model || !embedModel) {
      return finalize(
        errorResponse(
          ErrorCode.VALIDATION_ERROR,
          400,
          requestId,
          'providerType, baseUrl, model and embedModel are required',
        ),
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await tenantAiProviderRepository.upsertProviderConfig(guard.tenantId, {
      providerType: payload.providerType,
      baseUrl: payload.baseUrl,
      model: payload.model,
      embedModel,
      timeoutMs: payload.timeoutMs,
      isEnabled,
    });

    return finalize(NextResponse.json({ tenantId: guard.tenantId, updated: true }));
  } catch (error) {
    structuredLogger.error('tenant_ai_provider_put_failed', {
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

export const GET = withGlobalErrorInterceptor(_GET);

export const PUT = withGlobalErrorInterceptor(_PUT);
