'use server';

import { getDb } from '@/infra/db';
import { domineEvents } from '@/drizzle/schema';
import { eq, count, and } from 'drizzle-orm';

export async function getDomineOverviewCounts(tenantId: string) {
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

    return counts;
}

export async function runProcessorNow(tenantId: string) {
    // Uses the INTERNAL_JOB_TOKEN to trigger the internal QA/ops route if it exists
    // Fallback: we can just call it via local fetch
    try {
        const token = process.env.INTERNAL_JOB_TOKEN || process.env.INTERNAL_TOKEN || '';
        const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/internal/jobs/domine-process?tenantId=${tenantId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'x-internal-token': token,
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error('Run processor failed:', await res.text());
            return { success: false, error: 'Failed to run processor' };
        }

        return { success: true, message: 'Processor run triggered successfully' };
    } catch (e: any) {
        console.error('Run processor error:', e);
        return { success: false, error: e.message };
    }
}

export async function retryDomineEvent(tenantId: string, eventId: string) {
    try {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'queued', errorCode: null, errorMessage: null })
            .where(and(eq(domineEvents.id, eventId), eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'failed')));

        return { success: true };
    } catch (e: any) {
        console.error('Retry event error:', e);
        return { success: false };
    }
}
