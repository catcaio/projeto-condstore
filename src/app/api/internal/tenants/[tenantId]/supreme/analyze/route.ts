export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { analyzeTenant } from '@/lib/supreme/frank-supremo-analyzer';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId required');

    // We allow an optional 'rangeDays' parameter in body
    let rangeDays = 30;
    try {
        const bodyText = await request.text();
        if (bodyText) {
            const body = JSON.parse(bodyText);
            if (typeof body.rangeDays === 'number') rangeDays = body.rangeDays;
        }
    } catch {
        // ignore JSON parse errors on optional body
    }

    try {
        const result = await analyzeTenant(tenantId, rangeDays);
        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to run analysis');
    }
};
