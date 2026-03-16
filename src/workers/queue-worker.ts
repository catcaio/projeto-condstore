/**
 * Queue Worker — Polls queue_jobs and processes pending jobs.
 * 
 * Jobs supported:
 *   - recalculate_pipeline
 *   - generate_frank_insights  
 *   - sync_search_index
 *   - evaluate_workflows
 * 
 * Usage: node --import tsx src/workers/queue-worker.ts
 */

import { logger } from '@/infra/logger';
import { queueService } from '@/services/queue.service';

const POLL_INTERVAL_MS = 5000;

// --- Job Handlers ---

type JobHandler = (payload: Record<string, unknown>, tenantId: string | null) => Promise<void>;

const handlers: Record<string, JobHandler> = {
    async recalculate_pipeline(payload, tenantId) {
        logger.info('job_recalculate_pipeline_start', { tenantId });
        // Pipeline recalculation logic would go here
        // e.g., aggregate CRM opportunity counts by stage
        logger.info('job_recalculate_pipeline_done', { tenantId });
    },

    async generate_frank_insights(payload, tenantId) {
        logger.info('job_generate_frank_insights_start', { tenantId });
        // Frank insight generation logic would go here
        // e.g., analyze recent conversations and create suggestions
        logger.info('job_generate_frank_insights_done', { tenantId });
    },

    async sync_search_index(payload, tenantId) {
        logger.info('job_sync_search_index_start', { tenantId });
        // Search index sync logic would go here
        // e.g., re-index all entities from source tables
        logger.info('job_sync_search_index_done', { tenantId });
    },

    async evaluate_workflows(payload, tenantId) {
        logger.info('job_evaluate_workflows_start', { tenantId });
        // Workflow evaluation logic would go here
        // e.g., check schedule-based triggers
        logger.info('job_evaluate_workflows_done', { tenantId });
    },
};

// --- Worker Loop ---

async function processNextJob(): Promise<boolean> {
    const job = await queueService.claimNext();
    if (!job) return false;

    const handler = handlers[job.type];
    if (!handler) {
        await queueService.fail(job.id, `Unknown job type: ${job.type}`);
        logger.warn('queue_worker_unknown_job_type', { jobId: job.id, type: job.type });
        return true;
    }

    try {
        await handler(job.payload, job.tenantId);
        await queueService.complete(job.id);
        logger.info('queue_worker_job_completed', { jobId: job.id, type: job.type });
    } catch (err) {
        await queueService.fail(job.id, (err as Error).message);
        logger.error('queue_worker_job_failed', err as Error, { jobId: job.id, type: job.type });
    }

    return true;
}

async function run(): Promise<void> {
    logger.info('queue_worker_started');

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const processed = await processNextJob();
            if (!processed) {
                // Nothing to process, wait before polling again
                await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
            }
        } catch (err) {
            logger.error('queue_worker_loop_error', err as Error);
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
    }
}

// Only start if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    run().catch((err) => {
        logger.error('queue_worker_fatal', err as Error);
        process.exit(1);
    });
}

export { run as runQueueWorker, processNextJob };
