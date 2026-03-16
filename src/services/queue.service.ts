import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { queueJobs } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { eq, and, lte, sql } from 'drizzle-orm';

// --- Types ---

export const JobTypes = [
    'recalculate_pipeline',
    'generate_frank_insights',
    'sync_search_index',
    'evaluate_workflows',
] as const;

export type JobType = typeof JobTypes[number];

// --- Service ---

export const queueService = {
    /**
     * Enqueue a new job.
     */
    async enqueue(params: {
        tenantId?: string;
        type: string;
        payload: Record<string, unknown>;
        scheduledAt?: Date;
        maxAttempts?: number;
    }): Promise<string> {
        const db = await getDb();
        const id = randomUUID();

        await db.insert(queueJobs).values({
            id,
            tenantId: params.tenantId ?? null,
            type: params.type,
            payload: params.payload,
            status: 'pending',
            attempts: 0,
            maxAttempts: params.maxAttempts ?? 3,
            scheduledAt: params.scheduledAt ?? new Date(),
        });

        logger.info('job_enqueued', { id, type: params.type });
        return id;
    },

    /**
     * Claim the next pending job for processing.
     * Uses SELECT ... FOR UPDATE semantics via status transition.
     */
    async claimNext(): Promise<{
        id: string;
        tenantId: string | null;
        type: string;
        payload: Record<string, unknown>;
        attempts: number;
    } | null> {
        const db = await getDb();

        // Find next pending job that is due
        const [job] = await db
            .select()
            .from(queueJobs)
            .where(
                and(
                    eq(queueJobs.status, 'pending'),
                    lte(queueJobs.scheduledAt, new Date()),
                )
            )
            .limit(1);

        if (!job) return null;

        // Claim it by updating status
        await db
            .update(queueJobs)
            .set({
                status: 'running',
                attempts: job.attempts + 1,
                startedAt: new Date(),
            })
            .where(
                and(
                    eq(queueJobs.id, job.id),
                    eq(queueJobs.status, 'pending'),
                )
            );

        return {
            id: job.id,
            tenantId: job.tenantId,
            type: job.type,
            payload: job.payload as Record<string, unknown>,
            attempts: job.attempts + 1,
        };
    },

    /**
     * Mark a job as completed.
     */
    async complete(jobId: string): Promise<void> {
        const db = await getDb();
        await db
            .update(queueJobs)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(queueJobs.id, jobId));
    },

    /**
     * Mark a job as failed. If attempts < maxAttempts, re-queue with backoff.
     */
    async fail(jobId: string, errorMsg: string): Promise<void> {
        const db = await getDb();

        const [job] = await db
            .select()
            .from(queueJobs)
            .where(eq(queueJobs.id, jobId))
            .limit(1);

        if (!job) return;

        if (job.attempts >= job.maxAttempts) {
            // Dead letter
            await db
                .update(queueJobs)
                .set({ status: 'dead', errorMsg, completedAt: new Date() })
                .where(eq(queueJobs.id, jobId));
            logger.warn('job_dead_lettered', { jobId, type: job.type, attempts: job.attempts });
        } else {
            // Re-queue with exponential backoff
            const backoffMs = Math.min(1000 * Math.pow(2, job.attempts), 300000); // max 5 min
            const nextScheduledAt = new Date(Date.now() + backoffMs);
            await db
                .update(queueJobs)
                .set({ status: 'pending', errorMsg, scheduledAt: nextScheduledAt })
                .where(eq(queueJobs.id, jobId));
            logger.info('job_retried', { jobId, type: job.type, attempts: job.attempts, nextScheduledAt });
        }
    },
};
