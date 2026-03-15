import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { listTaskEvents } from '@/modules/governance/repositories/governance.repository';

export async function GET(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const { taskId } = await context.params;
        const events = await listTaskEvents(auth.session.tenantId, taskId);
        return NextResponse.json({ ok: true, data: events });
    } catch (err: any) {
        logger.error('governance_list_task_events_error', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
