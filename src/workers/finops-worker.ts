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

// Memory structure to keep track of retries, simple exponential backoff simulation
const retryCounts = new Map<string, number>();

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

        // Processing succeeded
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
            // Exponential-ish backoff
            await delay(Math.pow(2, attempts) * 1000);
            throw err; // bubble up so we catch it and potentially redo
        }
    }
}

async function start() {
    logger.info('starting_finops_worker', { stream: STREAM_NAME, group: CONSUMER_GROUP, consumer: CONSUMER_NAME });

    // Wait until Redis is available
    while (!redisClient.isAvailable()) {
        logger.info('waiting_for_redis...');
        await delay(2000);
    }

    void consumeEvents(STREAM_NAME, CONSUMER_GROUP, CONSUMER_NAME, processEvent);
}

// Ensure the process stays alive
start().catch(err => {
    logger.error('worker_fatal_error', err);
    process.exit(1);
});
