import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '../../../../../infra/http/error-response';
import { domineEventsRepository } from '../../../../../infra/repositories/domine-events.repository';
import { processDomineEvent } from '../../../../../domine/events/processor';
import { logger } from '../../../../../infra/logger';

export const maxDuration = 120; // Allow sufficient time for cron worker

export async function POST(request: NextRequest) {
    const token = request.headers.get('x-internal-token');

    // Fallback block if unauthorized
    if (token !== process.env.INTERNAL_TOKEN && process.env.NODE_ENV === 'production') {
        return errorResponse("UNAUTHORIZED" as any, 401, 'req', 'Invalid internal token');
    }
    if (!token && process.env.NODE_ENV !== 'production') {
        // Just bypass locally if no token is enforced, but usually internal jobs are tested with valid setup
    }

    try {
        const events = await domineEventsRepository.fetchProcessableEvents(50, 'LOJACOND'); // Priority tenant or omit for all

        let processed = 0;
        let failed = 0;

        const startTime = Date.now();
        const TIMEOUT_MS = 50 * 1000; // 50 seconds stop condition (Serverless functions timeout in 60s usually)

        for (const ev of events) {
            // Check time limits
            if (Date.now() - startTime > TIMEOUT_MS) {
                logger.warn('Domine process job stopping early due to timeout limits.');
                break;
            }

            // Attempt Atomic Lock
            const locked = await domineEventsRepository.lockEvent(ev.id);
            if (!locked) {
                continue; // Skip if grabbed by another worker concurrently
            }

            // Block process
            try {
                await processDomineEvent(ev);
                processed++;
            } catch (err: any) {
                failed++;
                logger.error(`Domine process error for event ${ev.id}`, err);
            }
        }

        return NextResponse.json({
            ok: true,
            summary: {
                pulled: events.length,
                processed,
                failed
            }
        });
    } catch (e: any) {
        logger.error('Domine processor job failed fatally', e);
        return errorResponse("INTERNAL_ERROR" as any, 500, 'req', e.message);
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
