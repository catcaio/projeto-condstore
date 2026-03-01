import { NextRequest, NextResponse } from 'next/server';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-internal-token');
    const validToken = process.env.INTERNAL_TOKEN;

    if (!validToken || (authHeader !== `Bearer ${validToken}` && authHeader !== validToken)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.nextUrl.searchParams.get('tenantId') || undefined;

    try {
        const stats = await domineEventsRepository.getDomineOperationalStats(tenantId);
        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch domine stats', details: error.message }, { status: 500 });
    }
}
