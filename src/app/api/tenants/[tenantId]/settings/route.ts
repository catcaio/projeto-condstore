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

import { tenantIncidentsRepository } from '../../../../../infra/repositories/tenant-incidents.repository';

export const runtime = 'nodejs';

interface TenantSettingsPayload {
  timezone?: string;
  outboundEnabled?: boolean;
  incidentMode?: boolean;
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

    const existingTenant = await tenantRepository.getTenantById(guard.tenantId);
    if (!existingTenant) {
      return finalize(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), ErrorCode.VALIDATION_ERROR);
    }

    let hasUpdates = false;
    let incidentUpdated = false;
    let tzUpdated = false;
    let outboundUpdated = false;

    if (payload.timezone !== undefined) {
      if (typeof payload.timezone !== 'string') {
        return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'timezone is required to be string'), ErrorCode.VALIDATION_ERROR);
      }
      const timezone = canonicalizeIanaTimeZone(payload.timezone);
      if (!timezone) {
        return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid timezone.'), ErrorCode.VALIDATION_ERROR);
      }
      timezoneForLog = timezone;
      await tenantRepository.updateTenantTimezone(guard.tenantId, timezone);
      hasUpdates = true;
      tzUpdated = true;
    }

    if (payload.outboundEnabled !== undefined) {
      if (typeof payload.outboundEnabled !== 'boolean') {
        return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'outboundEnabled must be boolean'), ErrorCode.VALIDATION_ERROR);
      }
      await tenantRepository.updateOutboundEnabled(guard.tenantId, payload.outboundEnabled);
      hasUpdates = true;
      outboundUpdated = true;

      // Log incident if kill switch is turned on (meaning outboundEnabled goes true -> false)
      if (existingTenant.outboundEnabled && !payload.outboundEnabled) {
        await tenantIncidentsRepository.logIncident({
          tenantId: guard.tenantId,
          type: 'kill_switch',
          startedAt: new Date(),
          triggeredBy: guard.sessionUser.sub,
          metadata: { outboundEnabled: false }
        });
      }
    }

    if (payload.incidentMode !== undefined) {
      if (typeof payload.incidentMode !== 'boolean') {
        return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'incidentMode must be boolean'), ErrorCode.VALIDATION_ERROR);
      }
      await tenantRepository.updateIncidentMode(guard.tenantId, payload.incidentMode);
      hasUpdates = true;
      incidentUpdated = true;

      // Log incident if turning on
      if (!existingTenant.incidentMode && payload.incidentMode) {
        await tenantIncidentsRepository.logIncident({
          tenantId: guard.tenantId,
          type: 'incident_mode',
          startedAt: new Date(),
          triggeredBy: guard.sessionUser.sub,
          metadata: { action: 'user_activated' }
        });
      } else if (existingTenant.incidentMode && !payload.incidentMode) {
        // If deactivated, we could close it, but for now just logging closure is fine or standard audit handles it
      }
    }

    if (hasUpdates) {
      await adminAuditLogRepository.log({
        tenantId: guard.tenantId,
        userId: guard.sessionUser.sub,
        action: 'tenant.update_settings',
        metadata: {
          requestId,
          changes: {
            timezone: tzUpdated ? timezoneForLog : undefined,
            outboundEnabled: outboundUpdated ? payload.outboundEnabled : undefined,
            incidentMode: incidentUpdated ? payload.incidentMode : undefined
          }
        },
      });
    }

    return finalize(NextResponse.json({
      tenantId: guard.tenantId,
      timezone: tzUpdated ? timezoneForLog : existingTenant.timezone,
      outboundEnabled: outboundUpdated ? payload.outboundEnabled : existingTenant.outboundEnabled,
      incidentMode: incidentUpdated ? payload.incidentMode : existingTenant.incidentMode,
      updated: hasUpdates,
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = extractTenantIdFromTenantRoute(request);
    const guard = await requireSessionTenantMatch(request, tenantId);
    if (!guard.ok) return guard.response;

    const existingTenant = await tenantRepository.getTenantById(guard.tenantId);
    if (!existingTenant) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      tenantId: existingTenant.id,
      timezone: existingTenant.timezone,
      outboundEnabled: existingTenant.outboundEnabled,
      incidentMode: existingTenant.incidentMode,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to GET tenant settings' }, { status: 500 });
  }
}
