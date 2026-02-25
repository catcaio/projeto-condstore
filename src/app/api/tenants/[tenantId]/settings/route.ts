import { NextRequest, NextResponse } from 'next/server';
import {
  extractTenantIdFromTenantRoute,
  requireSessionTenantMatch,
} from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { tenantRepository } from '../../../../../infra/repositories/tenant.repository';
import { canonicalizeIanaTimeZone } from '../../../../../infra/time/window';

export const runtime = 'nodejs';

interface TenantSettingsPayload {
  timezone?: unknown;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/tenants/[tenantId]/settings';
  let tenantIdForLog: string | undefined;
  let userIdForLog: string | undefined;
  let timezoneForLog: string | undefined;

  structuredLogger.info('tenant_settings_put_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('tenant_settings_put_end', {
      requestId,
      tenantId: tenantIdForLog,
      userId: userIdForLog,
      timezone: timezoneForLog,
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

    const guard = await requireSessionTenantMatch(request, tenantId);
    if (!guard.ok) return finalize(guard.response);

    userIdForLog = guard.sessionUser.sub;
    if (guard.sessionUser.role !== 'admin') {
      return finalize(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), ErrorCode.FORBIDDEN);
    }

    const payload = (await request.json()) as TenantSettingsPayload;
    if (typeof payload.timezone !== 'string') {
      return finalize(
        errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'timezone is required'),
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const timezone = canonicalizeIanaTimeZone(payload.timezone);
    if (!timezone) {
      return finalize(
        errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid timezone. Use a valid IANA timezone.'),
        ErrorCode.VALIDATION_ERROR,
      );
    }

    timezoneForLog = timezone;

    const existingTenant = await tenantRepository.getTenantById(guard.tenantId);
    if (!existingTenant) {
      return finalize(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), ErrorCode.VALIDATION_ERROR);
    }

    await tenantRepository.updateTenantTimezone(guard.tenantId, timezone);
    await adminAuditLogRepository.log({
      tenantId: guard.tenantId,
      userId: guard.sessionUser.sub,
      action: 'tenant.set_timezone',
      metadata: {
        timezone,
        requestId,
      },
    });

    return finalize(NextResponse.json({
      tenantId: guard.tenantId,
      timezone,
      updated: true,
    }));
  } catch (error) {
    structuredLogger.error('tenant_settings_put_failed', {
      requestId,
      tenantId: tenantIdForLog,
      userId: userIdForLog,
      timezone: timezoneForLog,
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
