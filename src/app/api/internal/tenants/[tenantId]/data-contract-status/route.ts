export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { validateTenantDataContract } from '@/lib/governance/tenant-data-contract';

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
        const db = await getDb();
        const result = await validateTenantDataContract(tenantId, db as any);

        return NextResponse.json({
            ok: true,
            data: result,
        });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to evaluate data contract');
    }
};
