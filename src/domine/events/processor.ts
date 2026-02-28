import { domineEventsRepository } from '../../infra/repositories/domine-events.repository';
import { logger } from '../../infra/logger';

const RETRY_BACKOFFS_MINUTES = [1, 5, 15, 60];

export async function processDomineEvent(eventRow: any) {
    try {
        logger.info(`Processing Domine Event ${eventRow.id}`, { type: eventRow.type, tenantId: eventRow.tenantId });

        // Idempotent processing implementation goes here based on eventRow.type
        // Example: if type === 'order.created', upsert read model order.
        if (eventRow.type === 'fail_me') {
            throw new Error('Forced failure for testing');
        }

        // Simulate processing for now with successful outcome.
        await new Promise(res => setTimeout(res, 50));

        await domineEventsRepository.markProcessed(eventRow.id);
    } catch (error: any) {
        logger.error(`Error processing Domine Event ${eventRow.id}`, error, { type: eventRow.type });

        const attempts = (eventRow.attempts || 0) + 1;
        const nextRetryMinutes = RETRY_BACKOFFS_MINUTES[attempts - 1];

        if (nextRetryMinutes !== undefined) {
            const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000);
            await domineEventsRepository.sendToDLQ(
                eventRow.id,
                error.code || 'PROCESSOR_ERROR',
                error.message,
                nextRetryAt,
                attempts
            );
        } else {
            // Max retries exceeded -> DLQ (no nextRetryAt)
            await domineEventsRepository.sendToDLQ(
                eventRow.id,
                error.code || 'MAX_RETRIES_EXCEEDED',
                error.message,
                null as any, // Send null to clear nextRetryAt
                attempts
            );
        }
    }
}
