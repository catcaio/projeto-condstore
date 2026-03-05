import { webhookEventRepository } from '../../infra/repositories/webhook-event.repository';
import { structuredLogger } from '../../infra/log/logger';

export type DedupeResult = 'new' | 'duplicate_event' | 'error';

export async function registerWebhookEvent(
    provider: string,
    eventId: string,
    eventType: string,
    payloadHash: string,
    requestId?: string
): Promise<DedupeResult> {
    try {
        const isNew = await webhookEventRepository.tryInsert({
            provider,
            eventId,
            eventType,
            payloadHash,
        });

        if (!isNew) {
            structuredLogger.info('webhook_duplicate_persistent', {
                requestId,
                eventType: 'webhook_duplicate_persistent',
                provider,
                eventId,
            });
            return 'duplicate_event';
        }

        return 'new';
    } catch (error) {
        structuredLogger.error('webhook_dedupe_insert_failed', {
            requestId,
            provider,
            eventId,
            error,
        });
        return 'error';
    }
}
