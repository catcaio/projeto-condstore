import { NextRequest, NextResponse } from 'next/server';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { requireSession } from '@/infra/auth/guards';

export async function GET(request: NextRequest) {
    const sessionResult = await requireSession(request);
    if (!sessionResult.ok) return sessionResult.response;

    const { tenantId } = sessionResult.session;
    const { searchParams } = new URL(request.url);

    const events = await ecosystemEventsService.getEvents({
        tenantId,
        type: searchParams.get('type') ?? undefined,
        entityType: searchParams.get('entityType') ?? undefined,
        entityId: searchParams.get('entityId') ?? undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    });

    return NextResponse.json({ events });
}
