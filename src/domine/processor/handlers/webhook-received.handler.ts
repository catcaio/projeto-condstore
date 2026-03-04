/**
 * WEBHOOK_RECEIVED event handler.
 *
 * Dispatched by the pull-based processor when a WEBHOOK_RECEIVED event is
 * dequeued from domine_events. Routes to appropriate internal services based
 * on the source field (stripe, twilio, etc.).
 *
 * This handler runs OUTSIDE of request-time — retries and DLQ are managed
 * by the processor.
 */
import type { EventHandler, EventHandlerResult } from '../dispatcher';
import { structuredLogger } from '../../../infra/log/logger';

export const webhookReceivedHandler: EventHandler = {
    eventType: 'WEBHOOK_RECEIVED',

    async handle(event): Promise<EventHandlerResult> {
        const start = Date.now();
        const payload = event.payloadJson as Record<string, unknown> | null;
        const source = (payload?.source as string) ?? event.source;
        const kind = (payload?.kind as string) ?? 'unknown';

        try {
            switch (source) {
                case 'stripe':
                case 'stripe_webhook':
                    // Stripe events are already idempotent via stripe_events table.
                    // Future: call billing service with the stored event data.
                    structuredLogger.info('domine_webhook_stripe_processed', {
                        eventId: event.id,
                        tenantId: event.tenantId,
                        kind,
                        providerEventId: payload?.providerEventId,
                        durationMs: Date.now() - start,
                    });
                    return { ok: true };

                case 'twilio':
                    // Twilio messages are already processed synchronously in the webhook
                    // route (TwiML reply required). This handler serves as audit +
                    // post-processing for analytics, attribution, and retention.
                    structuredLogger.info('domine_webhook_twilio_processed', {
                        eventId: event.id,
                        tenantId: event.tenantId,
                        kind,
                        providerEventId: payload?.providerEventId,
                        durationMs: Date.now() - start,
                    });
                    return { ok: true };

                default:
                    // Unknown source — log and pass through
                    structuredLogger.info('domine_webhook_unknown_source', {
                        eventId: event.id,
                        tenantId: event.tenantId,
                        source,
                        durationMs: Date.now() - start,
                    });
                    return { ok: true };
            }
        } catch (err: any) {
            structuredLogger.error('domine_webhook_handler_failed', {
                eventId: event.id,
                tenantId: event.tenantId,
                source,
                error: err.message,
                durationMs: Date.now() - start,
            });
            return { ok: false, error: err.message || 'Webhook handler failed' };
        }
    },
};
