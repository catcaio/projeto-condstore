export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { listTenantActions } from '@/lib/actions/action-engine';
import { isValidActionScope } from '@/lib/actions/action-types';
import type { ActionStatus } from '@/lib/actions/action-types';

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId required');

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as ActionStatus | null;
    const scope = url.searchParams.get('scope') ?? undefined;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

    if (scope && !isValidActionScope(scope)) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid scope: ${scope}`);
    }

    try {
        const rows = await listTenantActions(tenantId, {
            status: status ?? undefined,
            scope: (scope as any) ?? undefined,
            limit,
        });
        return NextResponse.json({ ok: true, data: rows, meta: { count: rows.length } });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to list actions');
    }
};
