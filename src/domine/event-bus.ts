import { EventEmitter } from 'events';
import { DomineEvent, DomineEventType } from './events/types';
import { logger } from '../infra/logger';
import { redisClient } from '../infra/redis.client';
import Redis from 'ioredis';

class DomineEventBus {
    private emitter: EventEmitter;
    private subscriberClient: Redis | null = null;
    private isConsuming = false;
    private handlers = new Map<DomineEventType, Array<(event: DomineEvent<any>) => Promise<void> | void>>();

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
        return new Promise(async (resolve, reject) => {
            let subClient: Redis | null = null;
            
            const cleanup = () => {
                this.emitter.removeListener(eventType, handler);
                if (subClient) {
                    subClient.unsubscribe(`pubsub:${eventType}`).catch(()=>{});
                    subClient.quit().catch(()=>{});
                }
            };
            
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout waiting for event ${eventType}`));
            }, timeoutMs);

            const handler = (event: DomineEvent<T>) => {
                if (matchFn(event)) {
                    clearTimeout(timeout);
                    cleanup();
                    resolve(event);
                }
            };
            
            this.emitter.on(eventType, handler);
            
            const raw = redisClient.getRawClient();
            if (raw) {
                subClient = raw.duplicate();
                await subClient.subscribe(`pubsub:${eventType}`);
                subClient.on('message', (channel, message) => {
                    try {
                        const event = JSON.parse(message) as DomineEvent<T>;
                        handler(event);
                    } catch (e) {}
                });
            }
        });
    }

    /**
     * Publishes a typed Domine Event to the internal and REDIS queue.
     */
    public publishEvent<T>(event: DomineEvent<T>): void {
        logger.info('domine_event_published', {
            eventId: event.id,
            eventType: event.type,
            tenantId: event.tenantId
        });

        // Always emit locally for in-process hooks (wait/tests)
        this.emitter.emit(event.type, event);

        const raw = redisClient.getRawClient();
        if (raw) {
            raw.lpush('queue:domine_events', JSON.stringify(event)).catch((e: any) => 
                logger.error('failed_to_enqueue_redis', e)
            );
            raw.publish(`pubsub:${event.type}`, JSON.stringify(event)).catch(() => {});
        }
    }

    /**
     * Subscribes to a specific Domine Event type (triggers Redis Consume loop).
     */
    public subscribeEvent<T>(
        eventType: DomineEventType,
        handler: (event: DomineEvent<T>) => Promise<void> | void
    ): void {
        const list = this.handlers.get(eventType) || [];
        list.push(handler);
        this.handlers.set(eventType, list);

        // Keep local behavior to avoid breaking tests
        this.emitter.on(eventType, async (event: DomineEvent<T>) => {
            try { await handler(event); } catch (e) {
                logger.error('domine_event_handler_failed_local', e as Error, { eventId: event.id });
            }
        });

        logger.info('domine_event_subscribed', { eventType });
        this.startRedisConsumerLoop();
    }

    private startRedisConsumerLoop() {
        if (this.isConsuming) return;
        const mainRaw = redisClient.getRawClient();
        if (!mainRaw) return;

        logger.info('Starting Redis BRPOP consumer loop for domine_events');
        this.isConsuming = true;
        this.subscriberClient = mainRaw.duplicate();

        const consume = async () => {
            while (this.isConsuming) {
                try {
                    const result = await this.subscriberClient!.brpop('queue:domine_events', 5);
                    if (result) {
                        const event = JSON.parse(result[1]) as DomineEvent<any>;
                        const eventHandlers = this.handlers.get(event.type);
                        
                        if (eventHandlers && eventHandlers.length > 0) {
                            for (const h of eventHandlers) {
                                try { await h(event); } 
                                catch (e) { logger.error('domine_event_handler_failed_redis', e as Error, { eventId: event.id }); }
                            }
                        }
                    }
                } catch (e: any) {
                    if (e.message?.includes('Connection is closed')) {
                        // Soft retry without flooding logs during shutdown
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        logger.error('redis_consume_loop_error', e);
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }
            }
        };
        
        consume();
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
