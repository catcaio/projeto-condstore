import 'dotenv/config'; // Used for starting directly with tsx
import os from 'os';
import { consumeEvents, ackEvent, moveToDLQ, EventPayload } from '../core/events/event-bus';
import { logger } from '../infra/logger';
import { redisClient } from '../infra/redis.client';
import { fireFinOpsAlert, fireFinOpsLockEvent } from '../core/ai/tenant-state-resolver';
import { runMonthlyReset } from '../modules/finops/finops-reset.service';

const STREAM_NAME = 'events:finops';
const CONSUMER_GROUP = 'finops-group';
const CONSUMER_NAME = `${os.hostname()}-${process.pid}`;
const MAX_RETRIES = 5;

// ── Graceful shutdown ─────────────────────────────────────────────────────

/** Flag shared between the consume loop (in event-bus) and this process. */
let shuttingDown = false;

/**
 * Exported so event-bus.ts can be updated in the future to check it.
 * Also used here to drive the outer retry loop below.
 */
export function isShuttingDown(): boolean {
    return shuttingDown;
}

async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return; // idempotent
    shuttingDown = true;

    logger.info('worker_shutdown_signal', { signal, consumer: CONSUMER_NAME });

    // Give in-progress handlers up to 8 s to finish naturally
    const DRAIN_MS = 8_000;
    const deadline = Date.now() + DRAIN_MS;

    logger.info('worker_draining', { drainMs: DRAIN_MS });

    await new Promise<void>((resolve) => {
        const poll = setInterval(() => {
            // Once the loop exits (because shuttingDown=true), resolve
            if (Date.now() >= deadline) {
                clearInterval(poll);
                resolve();
            }
        }, 200);
    });

    // Flush / disconnect Redis (best-effort)
    try {
        const raw = redisClient.getRawClient();
        if (raw) {
            await raw.quit();
            logger.info('worker_redis_disconnected');
        }
    } catch (err) {
        logger.warn('worker_redis_disconnect_failed', { err });
    }

    logger.info('worker_shutdown_complete', { signal });
    process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// ── Retry tracking ────────────────────────────────────────────────────────

const retryCounts = new Map<string, number>();

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Event processing ──────────────────────────────────────────────────────

async function processEvent(payload: EventPayload, rawId: string): Promise<void> {
    const attempts = (retryCounts.get(rawId) || 0) + 1;
    logger.info('processing_finops_event', { id: payload.id, type: payload.type, rawId, attempt: attempts });

    try {
        switch (payload.type) {
            case 'FINOPS_ALERT_TRANSITION': {
                const data = payload.data as any;
                await fireFinOpsAlert(payload.tenantId, data.prevState, data.nextState, data.metrics);
                break;
            }
            case 'FINOPS_LOCK_TRANSITION': {
                const data = payload.data as any;
                await fireFinOpsLockEvent(
                    payload.tenantId,
                    data.snapshot.currentMonthUsd,
                    data.snapshot.monthlyBudgetUsd,
                    data.snapshot.burnRatePerDay
                );
                break;
            }
            case 'FINOPS_MONTHLY_RESET': {
                const data = payload.data as any;
                await runMonthlyReset(
                    payload.tenantId,
                    new Date(data.timestamp),
                    data.currentMonthUsd,
                    data.burnRatePerDay
                );
                break;
            }
            case 'CACHE_INVALIDATE': {
                const data = payload.data as any;
                for (const key of data.keys) {
                    await redisClient.del(key);
                }
                break;
            }
            default:
                logger.warn('unknown_event_type', { type: payload.type, id: payload.id });
        }

        await ackEvent(STREAM_NAME, CONSUMER_GROUP, rawId);
        logger.info('event_processed_successfully', { id: payload.id, type: payload.type, rawId });
        retryCounts.delete(rawId);

    } catch (err) {
        logger.error('event_processing_failed', err as Error, { id: payload.id, rawId, attempt: attempts });

        if (attempts >= MAX_RETRIES) {
            await moveToDLQ(STREAM_NAME, CONSUMER_GROUP, rawId, payload, (err as Error).message);
            retryCounts.delete(rawId);
        } else {
            retryCounts.set(rawId, attempts);
            await delay(Math.pow(2, attempts) * 1000);
            throw err;
        }
    }
}

// ── Start + outer resilience loop ─────────────────────────────────────────

async function consumeLoop(): Promise<void> {
    const redis = redisClient.getRawClient();
    if (!redis) return;

    // Ensure consumer group exists
    try {
        await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            logger.error('failed_to_create_consumer_group', err, { stream: STREAM_NAME, group: CONSUMER_GROUP });
            return;
        }
    }

    logger.info('consumer_started', { stream: STREAM_NAME, group: CONSUMER_GROUP, consumer: CONSUMER_NAME });

    while (!shuttingDown) {
        try {
            const results = await redis.xreadgroup(
                'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
                'COUNT', 1,
                'BLOCK', 2000,
                'STREAMS', STREAM_NAME, '>'
            );

            if (shuttingDown) break;

            if (results && results.length > 0) {
                const [, messages] = results[0] as [string, [string, string[]][]];
                for (const [id, msgFields] of messages) {
                    if (shuttingDown) break;
                    const payloadStr = msgFields[msgFields.indexOf('payload') + 1];
                    if (payloadStr) {
                        const payload = JSON.parse(payloadStr) as EventPayload;
                        await processEvent(payload, id);
                    } else {
                        await ackEvent(STREAM_NAME, CONSUMER_GROUP, id);
                    }
                }
            }
        } catch (err) {
            if (shuttingDown) break;
            logger.error('consume_error', err as Error, { stream: STREAM_NAME, group: CONSUMER_GROUP });
            await delay(3000);
        }
    }

    logger.info('consume_loop_exited', { consumer: CONSUMER_NAME });
}

async function start(): Promise<void> {
    logger.info('starting_finops_worker', {
        stream: STREAM_NAME,
        group: CONSUMER_GROUP,
        consumer: CONSUMER_NAME,
        pid: process.pid,
    });

    // Wait until Redis is available
    while (!redisClient.isAvailable()) {
        logger.info('waiting_for_redis...');
        await delay(2000);
    }

    await consumeLoop();
}

start().catch(err => {
    logger.error('worker_fatal_error', err);
    process.exit(1);
});
