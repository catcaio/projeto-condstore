import { EventEmitter } from 'events';
import { DomineEvent, DomineEventType } from './events/types';
import { logger } from '../infra/logger';

class DomineEventBus {
    private emitter: EventEmitter;

    constructor() {
        this.emitter = new EventEmitter();
        // Increase max listeners to prevent warnings as we add multiple workers
        this.emitter.setMaxListeners(20);
    }

    /**
     * Expose internal emitter for advanced use cases (like once)
     */
    public getEmitter(): EventEmitter {
        return this.emitter;
    }

    /**
     * Waits for an event matching a specific condition
     */
    public waitForEvent<T>(
        eventType: DomineEventType,
        matchFn: (event: DomineEvent<T>) => boolean,
        timeoutMs: number = 10000
    ): Promise<DomineEvent<T>> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.emitter.removeListener(eventType, handler);
                reject(new Error(`Timeout waiting for event ${eventType}`));
            }, timeoutMs);

            const handler = (event: DomineEvent<T>) => {
                if (matchFn(event)) {
                    clearTimeout(timeout);
                    this.emitter.removeListener(eventType, handler);
                    resolve(event);
                }
            };
            this.emitter.on(eventType, handler);
        });
    }

    /**
     * Publishes a typed Domine Event to the internal in-memory bus.
     */
    public publishEvent<T>(event: DomineEvent<T>): void {
        logger.info('domine_event_published', {
            eventId: event.id,
            eventType: event.type,
            tenantId: event.tenantId
        });

        // Emit using the event type as the channel
        this.emitter.emit(event.type, event);
    }

    /**
     * Subscribes to a specific Domine Event type.
     */
    public subscribeEvent<T>(
        eventType: DomineEventType,
        handler: (event: DomineEvent<T>) => Promise<void> | void
    ): void {
        this.emitter.on(eventType, async (event: DomineEvent<T>) => {
            try {
                await handler(event);
            } catch (error) {
                logger.error('domine_event_handler_failed', error as Error, {
                    eventId: event.id,
                    eventType: event.type,
                    tenantId: event.tenantId,
                });
            }
        });

        logger.info('domine_event_subscribed', { eventType });
    }
}

// Export a singleton instance
export const eventBus = new DomineEventBus();

// Expose the raw functions for ease of use matching the request
export function publishEvent<T>(event: DomineEvent<T>): void {
    eventBus.publishEvent(event);
}

export function subscribeEvent<T>(
    eventType: DomineEventType,
    handler: (event: DomineEvent<T>) => Promise<void> | void
): void {
    eventBus.subscribeEvent(eventType, handler);
}
