import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import {
    getKnowledgeById,
    updateKnowledgeEntry,
    deleteKnowledgeEntry,
} from '@/modules/frank/knowledge/knowledge.service';
import { applyFrankCockpitRateLimit } from '@/infra/security/frank-rate-limit';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/knowledge/[id]' });
    if (rl.blocked) return rl.response;

    try {
        const entry = await getKnowledgeById(tenantId, id);
        if (!entry) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Knowledge entry not found');
        }

        const res = NextResponse.json({ ok: true, data: entry }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load knowledge entry');
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/knowledge/[id]' });
    if (rl.blocked) return rl.response;

    try {
        const body = await request.json();
        await updateKnowledgeEntry({ id, tenantId, ...body });

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to update knowledge entry');
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/knowledge/[id]' });
    if (rl.blocked) return rl.response;

    try {
        await deleteKnowledgeEntry(tenantId, id);

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to delete knowledge entry');
    }
}
