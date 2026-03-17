import 'dotenv/config'; // Used for starting directly with tsx
import os from 'os';
import { subscribeEvent } from '../domine/event-bus';
import { DomineEvent } from '../domine/events/types';
import { logger } from '../infra/logger';
import { redisClient } from '../infra/redis.client';
import { fireFinOpsAlert, fireFinOpsLockEvent } from '../core/ai/tenant-state-resolver';
import { runMonthlyReset } from '../modules/finops/finops-reset.service';

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

async function processEvent(event: DomineEvent, payload: any): Promise<void> {
    const rawId = event.id;
    const attempts = (retryCounts.get(rawId) || 0) + 1;
    logger.info('processing_finops_event', { id: event.id, type: payload.action, rawId, attempt: attempts });

    try {
        switch (payload.action) {
            case 'alert_transition': {
                const data = payload as any;
                await fireFinOpsAlert(event.tenantId!, data.prevState, data.nextState, data.metrics);
                break;
            }
            case 'lock_transition': {
                const data = payload as any;
                await fireFinOpsLockEvent(
                    event.tenantId!,
                    data.snapshot.currentMonthUsd,
                    data.snapshot.monthlyBudgetUsd,
                    data.snapshot.burnRatePerDay
                );
                break;
            }
            case 'monthly_reset': {
                const data = payload as any;
                await runMonthlyReset(
                    event.tenantId!,
                    new Date(data.timestamp),
                    data.currentMonthUsd,
                    data.burnRatePerDay
                );
                break;
            }
            case 'cache_invalidate': {
                const data = payload as any;
                await Promise.all((data.keys as string[]).map((key: string) => redisClient.del(key)));
                break;
            }
            default:
                logger.warn('unknown_event_type', { type: payload.action, id: event.id });
        }

        logger.info('queue_jobs_processed_total', { id: event.id, type: payload.action, rawId });
        retryCounts.delete(rawId);

    } catch (err) {
        logger.error('event_processing_failed', err as Error, { id: event.id, rawId, attempt: attempts });

        if (attempts >= MAX_RETRIES) {
            logger.error('queue_jobs_failed_total', new Error('Max retries exceeded'), { id: event.id, payload });
            retryCounts.delete(rawId);
        } else {
            retryCounts.set(rawId, attempts);
            await delay(Math.pow(2, attempts) * 1000);
            throw err;
        }
    }
}

export function startFinopsWorker() {
    logger.info('Starting FinOps Worker on Domine Event...');
    subscribeEvent('FINOPS_EVENT', async (event: DomineEvent) => {
        const payload = event.payload as any;
        await processEvent(event, payload);
    });
}

const isMain = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('finops-worker.ts');
if (isMain) {
    if (!redisClient.isAvailable()) {
        logger.error('Redis not available. Exiting finops worker.');
        process.exit(1);
    }
    startFinopsWorker();
}
