export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { listFindings } from '@/lib/supreme/frank-supremo-analyzer';
import type { FindingStatus, FindingDomain } from '@/lib/supreme/frank-supremo-analyzer';

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
    const status = url.searchParams.get('status') as FindingStatus | null;
    const domain = url.searchParams.get('domain') as FindingDomain | null;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

    try {
        const rows = await listFindings(tenantId, {
            status: status ?? undefined,
            domain: domain ?? undefined,
            limit,
        });
        return NextResponse.json({ ok: true, data: rows, meta: { count: rows.length } });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to list findings');
    }
};
