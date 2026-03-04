/**
 * Dead Letter Queue helper for Domine Events.
 */
import { logger } from '../../infra/logger';

export interface DLQEntry {
    eventId: string;
    tenantId: string;
    eventType: string;
    payloadJson: unknown;
    failureReason: string;
    retryCount: number;
}

/**
 * Move an event to the Dead Letter Queue.
 * @returns The DLQ entry ID.
 */
export async function moveToDLQ(
    db: any,
    dlqTable: any,
    entry: DLQEntry,
): Promise<string> {
    const id = crypto.randomUUID();

    await db.insert(dlqTable).values({
        id,
        eventId: entry.eventId,
        tenantId: entry.tenantId,
        eventType: entry.eventType,
        payloadJson: entry.payloadJson,
        failureReason: entry.failureReason,
        retryCount: entry.retryCount,
    });

    logger.warn('domine_event_dlq', {
        eventId: entry.eventId,
        tenantId: entry.tenantId,
        eventType: entry.eventType,
        retryCount: entry.retryCount,
    });

    return id;
}
