/**
 * Connector event handler stub.
 * Processes connector_event types from the Universal Intake.
 */
import type { EventHandler, EventHandlerResult } from '../dispatcher';
import { logger } from '../../../infra/logger';

export const connectorEventHandler: EventHandler = {
    eventType: 'connector_event',

    async handle(event): Promise<EventHandlerResult> {
        const start = Date.now();

        try {
            // For now, connector events are logged and marked as processed.
            // Future: route to specific connector adapters (Shopify, Nuvemshop, etc.)
            logger.info('domine_connector_event_processed', {
                eventId: event.id,
                tenantId: event.tenantId,
                source: event.source,
                durationMs: Date.now() - start,
            });

            return { ok: true };
        } catch (err: any) {
            logger.error('domine_connector_event_failed', err, {
                eventId: event.id,
                tenantId: event.tenantId,
            });
            return { ok: false, error: err.message || 'Unknown error' };
        }
    },
};
