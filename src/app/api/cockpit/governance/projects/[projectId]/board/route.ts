import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { listProjectBoard } from '@/modules/governance/services/governance.service';

export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const { projectId } = await context.params;
        const ctx = {
            tenantId: auth.session.tenantId,
            actorUserId: auth.session.sub,
            role: auth.session.role,
        };
        const board = await listProjectBoard(ctx, projectId);
        return NextResponse.json({ ok: true, data: board });
    } catch (err: any) {
        logger.error('governance_list_project_board_error', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
