/**
 * Domine Event Processor v1 — main processing loop.
 *
 * Fetches queued/retryable events from domine_events,
 * dispatches them to handlers, manages retries and DLQ.
 */
import { eq, and, lte, or } from 'drizzle-orm';
import { domineEvents, domineEventsDlq } from '../../drizzle/schema';
import { dispatchEvent } from './dispatcher';
import { getNextRetryAt, shouldMoveToDLQ } from './retry-policy';
import { moveToDLQ } from './dead-letter';
import { logger } from '../../infra/logger';

// ─── Metrics (in-memory counters — exposed via stats endpoint) ──────────
export const processorMetrics = {
    processed: 0,
    failed: 0,
    retried: 0,
    dlq: 0,
};

export function resetMetrics(): void {
    processorMetrics.processed = 0;
    processorMetrics.failed = 0;
    processorMetrics.retried = 0;
    processorMetrics.dlq = 0;
}

/**
 * Process a single event by ID.
 */
export async function processEvent(
    db: any,
    eventId: string,
): Promise<{ status: 'completed' | 'retried' | 'dlq' | 'not_found' }> {
    // 1. Fetch event
    const rows = await db
        .select()
        .from(domineEvents)
        .where(eq(domineEvents.id, eventId))
        ;

    const event = rows[0];
    if (!event) return { status: 'not_found' };

    // 2. Mark as processing
    await db
        .update(domineEvents)
        .set({ status: 'processing' })
        .where(eq(domineEvents.id, eventId));

    const start = Date.now();

    try {
        // 3. Dispatch to handler
        const result = await dispatchEvent({
            id: event.id,
            tenantId: event.tenantId,
            type: event.type,
            source: event.source,
            payloadJson: event.payloadJson,
        });

        if (result.ok) {
            // 4a. Success → mark completed
            await db
                .update(domineEvents)
                .set({
                    status: 'completed',
                    processedAt: new Date(),
                })
                .where(eq(domineEvents.id, eventId));

            processorMetrics.processed++;

            logger.info('domine_event_processed', {
                eventId: event.id,
                tenantId: event.tenantId,
                eventType: event.type,
                processor: 'domine_processor_v1',
                durationMs: Date.now() - start,
                status: 'completed',
            });

            return { status: 'completed' };
        }

        // 4b. Handler returned failure
        return await handleFailure(db, event, result.error || 'Handler returned failure', start);
    } catch (err: any) {
        // 4c. Unhandled error
        return await handleFailure(db, event, err.message || 'Unhandled error', start);
    }
}

/**
 * Handle a processing failure: schedule retry or move to DLQ.
 */
async function handleFailure(
    db: any,
    event: any,
    errorMsg: string,
    startMs: number,
): Promise<{ status: 'retried' | 'dlq' }> {
    const newRetryCount = (event.retryCount || 0) + 1;

    if (shouldMoveToDLQ(newRetryCount)) {
        // Move to DLQ
        await moveToDLQ(db, domineEventsDlq, {
            eventId: event.id,
            tenantId: event.tenantId,
            eventType: event.type,
            payloadJson: event.payloadJson,
            failureReason: errorMsg,
            retryCount: newRetryCount,
        });

        await db
            .update(domineEvents)
            .set({
                status: 'dead_letter',
                retryCount: newRetryCount,
                errorCode: 'MAX_RETRIES_EXCEEDED',
                errorMessage: errorMsg,
            })
            .where(eq(domineEvents.id, event.id));

        processorMetrics.dlq++;
        processorMetrics.failed++;

        logger.warn('domine_event_dlq', {
            eventId: event.id,
            tenantId: event.tenantId,
            eventType: event.type,
            retryCount: newRetryCount,
            durationMs: Date.now() - startMs,
        });

        return { status: 'dlq' };
    }

    // Schedule retry
    const nextRetry = getNextRetryAt(newRetryCount);

    await db
        .update(domineEvents)
        .set({
            status: 'failed',
            retryCount: newRetryCount,
            nextRetryAt: nextRetry,
            errorCode: 'PROCESSING_FAILED',
            errorMessage: errorMsg,
        })
        .where(eq(domineEvents.id, event.id));

    processorMetrics.retried++;
    processorMetrics.failed++;

    logger.info('domine_event_retry_scheduled', {
        eventId: event.id,
        tenantId: event.tenantId,
        eventType: event.type,
        retryCount: newRetryCount,
        nextRetryAt: nextRetry?.toISOString(),
        durationMs: Date.now() - startMs,
    });

    return { status: 'retried' };
}

/**
 * Fetch events ready for processing (queued or failed with retry time passed).
 */
export async function fetchReadyEvents(
    db: any,
    limit = 10,
): Promise<any[]> {
    const now = new Date();

    return db
        .select()
        .from(domineEvents)
        .where(
            or(
                eq(domineEvents.status, 'queued'),
                and(
                    eq(domineEvents.status, 'failed'),
                    lte(domineEvents.nextRetryAt, now),
                ),
            ),
        )
        .limit(limit);
}

/**
 * Process a batch of ready events.
 */
export async function processBatch(
    db: any,
    limit = 10,
): Promise<{ processed: number; retried: number; dlq: number }> {
    const events = await fetchReadyEvents(db, limit);
    let processed = 0, retried = 0, dlq = 0;

    for (const event of events) {
        const result = await processEvent(db, event.id);
        if (result.status === 'completed') processed++;
        else if (result.status === 'retried') retried++;
        else if (result.status === 'dlq') dlq++;
    }

    return { processed, retried, dlq };
}
