/**
 * Event handler interface and dispatcher for Domine events.
 */
import { logger } from '../../infra/logger';

export interface EventHandlerResult {
    ok: boolean;
    error?: string;
}

export interface EventHandler {
    eventType: string;
    handle(event: {
        id: string;
        tenantId: string;
        type: string;
        source: string;
        payloadJson: unknown;
    }): Promise<EventHandlerResult>;
}

// ─── Handler Registry ──────────────────────────────────────────────────────
const handlers = new Map<string, EventHandler>();

export function registerHandler(handler: EventHandler): void {
    handlers.set(handler.eventType, handler);
    logger.info('domine_handler_registered', { eventType: handler.eventType });
}

/**
 * Dispatch an event to the appropriate handler.
 * Returns { ok: true } if no handler is registered (pass-through).
 */
export async function dispatchEvent(event: {
    id: string;
    tenantId: string;
    type: string;
    source: string;
    payloadJson: unknown;
}): Promise<EventHandlerResult> {
    const handler = handlers.get(event.type);

    if (!handler) {
        // No handler registered — treat as pass-through (success)
        logger.info('domine_event_no_handler', {
            eventId: event.id,
            eventType: event.type,
            tenantId: event.tenantId,
        });
        return { ok: true };
    }

    return handler.handle(event);
}

export function getRegisteredHandlers(): string[] {
    return Array.from(handlers.keys());
}
