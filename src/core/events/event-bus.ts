import { randomUUID } from 'crypto';
import { redisClient } from '../../infra/redis.client';
import { logger } from '../../infra/logger';

export interface EventPayload<T = unknown> {
    id: string;
    type: string;
    tenantId: string;
    createdAt: string;
    requestId?: string;
    data: T;
}

export type FinOpsEventType =
    | 'FINOPS_ALERT_TRANSITION'
    | 'FINOPS_LOCK_TRANSITION'
    | 'FINOPS_MONTHLY_RESET'
    | 'CACHE_INVALIDATE';

export type WebhookEventType =
    | 'WEBHOOK_INBOUND';

export type StreamEventType = FinOpsEventType | WebhookEventType;

interface PublishOptions {
    stream: string;
    type: StreamEventType;
    tenantId: string;
    data: any;
    requestId?: string;
}

/**
 * Publish an event to a Redis Stream with fire-and-forget fallback.
 * Throws if Redis is unavailable so the caller can execute the fallback.
 */
export async function publishEvent(options: PublishOptions): Promise<void> {
    const redis = redisClient.getRawClient();
    if (!redisClient.isAvailable() || !redis) {
        throw new Error('Redis is not available');
    }

    const payload: EventPayload = {
        id: randomUUID(),
        type: options.type,
        tenantId: options.tenantId,
        createdAt: new Date().toISOString(),
        requestId: options.requestId,
        data: options.data,
    };

    try {
        await redis.xadd(options.stream, '*', 'payload', JSON.stringify(payload));
        logger.info('event_published', { stream: options.stream, type: options.type, id: payload.id });
    } catch (err) {
        logger.error('failed_to_publish_event', err as Error, { stream: options.stream, type: options.type });
        throw err;
    }
}

export async function consumeEvents(
    stream: string,
    group: string,
    consumer: string,
    handler: (payload: EventPayload, rawId: string) => Promise<void>
): Promise<void> {
    const redis = redisClient.getRawClient();
    if (!redis) return;

    // Ensure group exists
    try {
        await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            logger.error('failed_to_create_consumer_group', err, { stream, group });
            return;
        }
    }

    logger.info('consumer_started', { stream, group, consumer });

    while (true) {
        try {
            const results = await redis.xreadgroup('GROUP', group, consumer, 'COUNT', 1, 'BLOCK', 2000, 'STREAMS', stream, '>');
            if (results && results.length > 0) {
                const [_, messages] = results[0] as [string, [string, string[]][]];
                for (const [id, msgFields] of messages) {
                    const payloadStr = msgFields[msgFields.indexOf('payload') + 1];
                    if (payloadStr) {
                        const payload = JSON.parse(payloadStr) as EventPayload;
                        await handler(payload, id);
                    } else {
                        // Malformed message, just ack
                        await ackEvent(stream, group, id);
                    }
                }
            }
        } catch (err) {
            logger.error('consume_error', err as Error, { stream, group, consumer });
            await new Promise(res => setTimeout(res, 3000));
        }
    }
}

export async function ackEvent(stream: string, group: string, id: string): Promise<void> {
    const redis = redisClient.getRawClient();
    if (!redis) return;
    await redis.xack(stream, group, id);
}

export async function moveToDLQ(stream: string, group: string, id: string, payload: EventPayload, reason: string): Promise<void> {
    const redis = redisClient.getRawClient();
    if (!redis) return;
    try {
        const dlqStream = `${stream}:dlq`;
        const dlqPayload = { ...payload, dlqReason: reason, dlqAt: new Date().toISOString() };
        await redis.xadd(dlqStream, '*', 'payload', JSON.stringify(dlqPayload));
        await ackEvent(stream, group, id);
        logger.warn('event_moved_to_dlq', { stream, id, reason });
    } catch (err) {
        logger.error('failed_to_move_to_dlq', err as Error, { stream, id });
    }
}
