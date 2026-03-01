import { NextRequest, NextResponse } from 'next/server';
import { domineEventBus } from '@/modules/domine/event-bus.service';
import { logger } from '@/infra/logger';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('x-internal-token') || request.headers.get('Authorization');
    const validToken = process.env.INTERNAL_JOB_TOKEN || process.env.INTERNAL_TOKEN;

    if (!validToken || (authHeader !== `Bearer ${validToken}` && authHeader !== validToken)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.nextUrl.searchParams.get('tenantId');
    const requestId = randomUUID();

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    try {
        logger.info('Domine processor explicit run requested', { requestId, tenantId });

        // This processAsync method now acts as a loop pulling until the queue is empty.
        // We do NOT await it so the HTTP connection doesn't hang indefinitely 
        // if the backlog is massive. We fire and forget.
        domineEventBus.processAsync(tenantId).catch(err => {
            logger.error('Domine processor async execution failed', err, { requestId, tenantId });
        });

        return NextResponse.json({ success: true, message: 'Processor dispatched in background' });
    } catch (error: any) {
        logger.error('Failed to trigger domine process', error, { requestId, tenantId });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
