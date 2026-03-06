export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { tenantSupremePermissionsRepository } from '@/infra/repositories/tenant-supreme-permissions.repository';

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId is required');
    }

    try {
        const permissions = await tenantSupremePermissionsRepository.getTenantSupremePermissions(tenantId);
        return NextResponse.json({ ok: true, data: permissions });
    } catch (err) {
        structuredLogger.error('supreme_permissions_get_failed', { requestId, error: err });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to fetch supreme permissions');
    }
};

// ── PUT ───────────────────────────────────────────────────────────────────────

export const PUT = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId is required');
    }

    let body: Record<string, boolean> = {};
    try {
        const raw = await request.text();
        if (raw.trim()) body = JSON.parse(raw);
    } catch {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
    }

    // Only allow boolean permission fields
    const ALLOWED_FIELDS = new Set([
        'allowReadMetrics',
        'allowGenerateRecommendations',
        'allowExecuteOptimizations',
        'allowAdsBudgetChanges',
        'allowCrmActions',
        'allowWhatsappAutomation',
    ]);

    const payload: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(body)) {
        if (ALLOWED_FIELDS.has(key) && typeof val === 'boolean') {
            payload[key] = val;
        }
    }

    if (Object.keys(payload).length === 0) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'No valid permission fields provided');
    }

    try {
        const updated = await tenantSupremePermissionsRepository.updateTenantSupremePermissions(tenantId, payload);
        return NextResponse.json({ ok: true, data: updated });
    } catch (err) {
        structuredLogger.error('supreme_permissions_put_failed', { requestId, error: err });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to update supreme permissions');
    }
};
