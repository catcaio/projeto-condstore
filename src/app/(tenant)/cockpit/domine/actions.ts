'use server';

import { getDb } from '@/infra/db';
import { domineEvents } from '@/drizzle/schema';
import { eq, count, and } from 'drizzle-orm';

import { logger } from '@/infra/logger';
import { randomUUID } from 'crypto';
import { headers } from 'next/headers';

async function getAuthContext() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');
    if (!tenantId || role !== 'admin') {
        throw new Error('Unauthorized');
    }
    return { tenantId };
}

export async function getDomineOverviewCounts() {
    const { tenantId } = await getAuthContext();
    const requestId = randomUUID();
    const startTime = Date.now();
    try {
        const db = await getDb();
        const rows = await db
            .select({
                status: domineEvents.status,
                count: count(),
            })
            .from(domineEvents)
            .where(eq(domineEvents.tenantId, tenantId))
            .groupBy(domineEvents.status);

        const counts = {
            queued: 0,
            processing: 0,
            processed: 0,
            failed: 0,
        };

        for (const row of rows) {
            if (row.status in counts) {
                counts[row.status as keyof typeof counts] = Number(row.count);
            }
        }

        logger.info('Domine Overview Fetched', {
            requestId, tenantId, action: 'get_overview_counts', duration: Date.now() - startTime, outcome: 'success'
        });
        return counts;
    } catch (e: any) {
        logger.error('Domine Overview Error', e, {
            requestId, tenantId, action: 'get_overview_counts', duration: Date.now() - startTime, outcome: 'failure'
        });
        throw e;
    }
}

export async function runProcessorNow() {
    const { tenantId } = await getAuthContext();
    const requestId = randomUUID();
    const startTime = Date.now();
    try {
        const token = process.env.INTERNAL_JOB_TOKEN || process.env.INTERNAL_TOKEN || '';
        const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/internal/jobs/domine-process?tenantId=${tenantId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'x-internal-token': token },
            cache: 'no-store'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logger.error('Domine Processor Run Failed', new Error(errorText), {
                requestId, tenantId, action: 'run_processor', duration: Date.now() - startTime, outcome: 'failure'
            });
            return { success: false, error: 'Failed to run processor' };
        }

        logger.info('Domine Processor Run Triggered', {
            requestId, tenantId, action: 'run_processor', duration: Date.now() - startTime, outcome: 'success'
        });
        return { success: true, message: 'Processor run triggered successfully' };
    } catch (e: any) {
        logger.error('Domine Processor Exception', e, {
            requestId, tenantId, action: 'run_processor', duration: Date.now() - startTime, outcome: 'failure'
        });
        return { success: false, error: e.message };
    }
}

export async function retryDomineEvent(eventId: string) {
    const { tenantId } = await getAuthContext();
    const requestId = randomUUID();
    const startTime = Date.now();
    try {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'queued', errorCode: null, errorMessage: null })
            .where(and(eq(domineEvents.id, eventId), eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'failed')));

        logger.info('Domine Event Retried', {
            requestId, tenantId, action: 'retry_event', duration: Date.now() - startTime, outcome: 'success', eventId
        });
        return { success: true };
    } catch (e: any) {
        logger.error('Domine Event Retry Error', e, {
            requestId, tenantId, action: 'retry_event', duration: Date.now() - startTime, outcome: 'failure', eventId
        });
        return { success: false };
    }
}
