import { NextRequest, NextResponse } from 'next/server';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const tenantId = searchParams.get('tenantId');
    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

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
