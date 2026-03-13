import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { timelineService } from '@/modules/timeline/timeline.service';
import { TimelineEntity } from '@/modules/timeline/timeline.types';

export async function GET(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(req.url);
        const entity = searchParams.get('entity') as TimelineEntity | undefined;
        const entityId = searchParams.get('entityId') || undefined;
        const cursorParam = searchParams.get('cursor');
        const limitParam = searchParams.get('limit');

        const cursor = cursorParam ? new Date(cursorParam) : undefined;
        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        const tenantId = auth.session.tenantId;

        const { events, nextCursor } = await timelineService.getTimeline(
            tenantId,
            limit,
            cursor,
            entity,
            entityId
        );

        return NextResponse.json({ ok: true, data: { events, nextCursor } });
    } catch (e) {
        console.error('[GET /api/cockpit/timeline]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'timeline_fetch_failed'
        });
    }
}
