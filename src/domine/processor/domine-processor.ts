/**
 * Domine Processor — pull-based loop with lock, retry/backoff and DLQ.
 *
 * processOnce(tenantId) → locks next event, dispatches, marks done/failed
 * loop(tenantId, max, maxDurationMs) → runs processOnce in a bounded loop
 */
import { domineEventsRepository } from '../../infra/repositories/domine-events.repository';
import { dispatchEvent } from './dispatcher';
import { structuredLogger } from '../../infra/log/logger';
import { isDomineEnabled } from '../tenant';

export interface ProcessorStats {
    processed: number;
    failed: number;
    dlq: number;
    reaped: number;
    iterations: number;
    durationMs: number;
}

/**
 * Process one event from the queue.
 * Returns true if an event was processed, false if queue is empty.
 */
export async function processOnce(tenantId: string): Promise<'completed' | 'failed' | 'empty'> {
    const event = await domineEventsRepository.lockAndGetNextEvent(tenantId);
    if (!event) return 'empty';

    const start = Date.now();
    try {
        const result = await dispatchEvent({
            id: event.id,
            tenantId: event.tenantId,
            type: event.type,
            source: event.source,
            payloadJson: event.payloadJson,
        });

        if (result.ok) {
            await domineEventsRepository.markDone(event.id, tenantId);
            structuredLogger.info('domine_processor_completed', {
                eventId: event.id,
                tenantId,
                type: event.type,
                durationMs: Date.now() - start,
            });
            return 'completed';
        }

        // Handler returned failure
        await domineEventsRepository.markFailed(event.id, tenantId, 'HANDLER_FAILED', result.error);
        structuredLogger.warn('domine_processor_failed', {
            eventId: event.id,
            tenantId,
            type: event.type,
            error: result.error,
            durationMs: Date.now() - start,
        });
        return 'failed';
    } catch (err: any) {
        await domineEventsRepository.markFailed(event.id, tenantId, 'UNHANDLED_ERROR', err.message);
        structuredLogger.error('domine_processor_error', {
            eventId: event.id,
            tenantId,
            type: event.type,
            error: err.message,
            durationMs: Date.now() - start,
        });
        return 'failed';
    }
}

/**
 * Pull-based processing loop.
 *
 * @param tenantId  - tenant to process when DOMINE is enabled
 * @param max       - max events to process in this invocation (default 50)
 * @param maxDurationMs - max wall-clock time for the loop (default 25s)
 */
export async function loop(
    tenantId: string,
    max: number = 50,
    maxDurationMs: number = 25_000,
): Promise<ProcessorStats> {
    const enabled = await isDomineEnabled(tenantId);
    if (!enabled) {
        throw new Error(`Domine is not enabled for tenant ${tenantId}`);
    }

    const stats: ProcessorStats = {
        processed: 0,
        failed: 0,
        dlq: 0,
        reaped: 0,
        iterations: 0,
        durationMs: 0,
    };

    const start = Date.now();

    // 1. Reap stale processing events first
    await domineEventsRepository.reapStaleProcessing(tenantId, 5);

    // 2. Process loop
    for (let i = 0; i < max; i++) {
        if (Date.now() - start > maxDurationMs) break;

        stats.iterations++;
        const result = await processOnce(tenantId);

        if (result === 'empty') break;
        if (result === 'completed') stats.processed++;
        if (result === 'failed') stats.failed++;
    }

    stats.durationMs = Date.now() - start;

    structuredLogger.info('domine_processor_loop_done', {
        tenantId,
        ...stats,
    });

    return stats;
}
