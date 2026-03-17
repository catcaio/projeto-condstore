import { subscribeEvent } from '../domine/event-bus';
import { logger } from '../infra/logger';
import { processStripeEvent, BillingServiceError } from '@/modules/billing';
import type Stripe from 'stripe';

export function startWebhookWorker() {
    logger.info('Starting Webhook Worker...');

    subscribeEvent('WEBHOOK_RECEIVED', async (event) => {
        const { stripeEvent } = event.payload as { stripeEvent: Stripe.Event };

        try {
            const handlerResult = await processStripeEvent(stripeEvent);
            if (handlerResult.ignored) {
                logger.info('webhook_worker_ignored_event', {
                    eventId: stripeEvent.id,
                    type: stripeEvent.type,
                    reason: handlerResult.reason
                });
            } else {
                logger.info('webhook_worker_processed_event', {
                    eventId: stripeEvent.id,
                    type: stripeEvent.type,
                });
            }
        } catch (err) {
            logger.error('webhook_worker_processing_failed', err as Error, {
                eventId: stripeEvent.id,
                type: stripeEvent.type,
                errorCode: err instanceof BillingServiceError ? err.code : 'UNKNOWN',
            });
            // Failed events should be picked up by DLQ if implemented in the worker loop in the future
        }
    });
}

if (require.main === module) {
    startWebhookWorker();
}
