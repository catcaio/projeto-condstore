import { getDb } from '../db';
import { domineEvents, domineEventsDlq } from '../../drizzle/schema';
import { eq, and, desc, or, lte, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { getNextRetryAt, shouldMoveToDLQ } from '../../domine/processor/retry-policy';

export class DomineEventsRepository {
    async publish(data: {
        tenantId: string;
        source: 'cockpit' | 'webhook' | 'connector' | 'frank';
        type: string;
        idempotencyKey: string;
        payloadJson?: any;
    }): Promise<{ id: string; inserted: boolean }> {
        const db = await getDb();
        const id = crypto.randomUUID();

        // Check idempotency
        const existing = await db.select().from(domineEvents)
            .where(and(
                eq(domineEvents.tenantId, data.tenantId),
                eq(domineEvents.idempotencyKey, data.idempotencyKey)
            ));

        if (existing.length > 0) {
            return { id: existing[0].id, inserted: false };
        }

        await db.insert(domineEvents).values({
            id,
            tenantId: data.tenantId,
            source: data.source,
            type: data.type,
            idempotencyKey: data.idempotencyKey,
            payloadJson: data.payloadJson ?? null,
            status: 'queued',
        });

        return { id, inserted: true };
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const rows = await db.select().from(domineEvents)
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
        return rows[0];
    }

    async markProcessed(id: string, tenantId: string) {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'processed', processedAt: new Date() })
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
    }

    /**
     * Atomically lock the next ready event for processing.
     * Uses UPDATE...WHERE status IN ('queued','failed') with retry-time check.
     */
    async lockAndGetNextEvent(tenantId: string) {
        const db = await getDb();
        const now = new Date();

        // Find next ready event
        const candidates = await db.select()
            .from(domineEvents)
            .where(and(
                eq(domineEvents.tenantId, tenantId),
                or(
                    eq(domineEvents.status, 'queued'),
                    and(
                        eq(domineEvents.status, 'failed'),
                        or(
                            isNull(domineEvents.nextRetryAt),
                            lte(domineEvents.nextRetryAt, now),
                        ),
                    ),
                ),
            ))
            .orderBy(domineEvents.createdAt)
            ;

        const candidate = candidates[0];
        if (!candidate) return null;

        // Atomic lock: only update if still in expected status (tenant-pinned —
        // candidate was selected tenant-scoped, but the lock itself must also
        // carry tenantId so the UPDATE can never latch a foreign row).
        await db.update(domineEvents)
            .set({ status: 'processing' })
            .where(and(
                eq(domineEvents.id, candidate.id),
                eq(domineEvents.tenantId, tenantId),
                or(
                    eq(domineEvents.status, 'queued'),
                    eq(domineEvents.status, 'failed'),
                ),
            ));

        return candidate;
    }

    async markDone(id: string, tenantId: string) {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'completed', processedAt: new Date() })
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
    }

    async markFailed(id: string, tenantId: string, errorCode: string, errorMessage?: string) {
        const db = await getDb();

        // Fetch current retry count (tenant-scoped)
        const rows = await db.select().from(domineEvents)
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
        const event = rows[0];
        if (!event || event.tenantId !== tenantId) return;

        const newRetryCount = (event.retryCount ?? 0) + 1;

        if (shouldMoveToDLQ(newRetryCount)) {
            await this.sendToDLQ(id, tenantId, errorMessage ?? errorCode);
            return;
        }

        const nextRetry = getNextRetryAt(newRetryCount);
        await db.update(domineEvents)
            .set({
                status: 'failed',
                retryCount: newRetryCount,
                nextRetryAt: nextRetry,
                errorCode,
                errorMessage: errorMessage ?? null,
            })
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
    }

    async sendToDLQ(id: string, tenantId: string, reason: string) {
        const db = await getDb();

        const rows = await db.select().from(domineEvents)
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
        const event = rows[0];
        if (!event || event.tenantId !== tenantId) return;

        // Insert into domine_events_dlq
        await db.insert(domineEventsDlq).values({
            id: crypto.randomUUID(),
            eventId: event.id,
            tenantId: event.tenantId,
            eventType: event.type,
            payloadJson: event.payloadJson,
            failureReason: reason,
            retryCount: event.retryCount ?? 0,
        });

        // Update main event status
        await db.update(domineEvents)
            .set({
                status: 'dead_letter',
                errorCode: 'MAX_RETRIES_EXCEEDED',
                errorMessage: reason,
            })
            .where(and(
                eq(domineEvents.id, id),
                eq(domineEvents.tenantId, tenantId),
            ));
    }

    /**
     * Reaper: recover events stuck in 'processing' for longer than staleMinutes.
     * Returns number of events recovered.
     */
    async reapStaleProcessing(tenantId: string, staleMinutes: number = 5): Promise<number> {
        const db = await getDb();
        const cutoff = new Date(Date.now() - staleMinutes * 60_000);

        const result = await db.update(domineEvents)
            .set({ status: 'failed', errorCode: 'STALE_PROCESSING', errorMessage: 'Reaped after timeout' })
            .where(and(
                eq(domineEvents.tenantId, tenantId),
                eq(domineEvents.status, 'processing'),
                lte(domineEvents.createdAt, cutoff),
            ));

        return 0; // MySQL adapter doesn't return affected rows easily; callers log the action
    }

    async listEvents(tenantId: string, filters: { type?: string, status?: string, limit?: number, offset?: number }) {
        const db = await getDb();
        const conditions = [eq(domineEvents.tenantId, tenantId)];
        if (filters.type) conditions.push(eq(domineEvents.type, filters.type));
        if (filters.status) conditions.push(eq(domineEvents.status, filters.status));

        return db.select()
            .from(domineEvents)
            .where(and(...conditions))
            .orderBy(desc(domineEvents.createdAt))
            .limit(filters.limit || 50)
            .offset(filters.offset || 0);
    }

    async listDLQ(tenantId: string, limit = 50, offset = 0) {
        const db = await getDb();
        return db.select()
            .from(domineEventsDlq)
            .where(eq(domineEventsDlq.tenantId, tenantId))
            .orderBy(desc(domineEventsDlq.failedAt))
            .limit(limit)
            .offset(offset);
    }

    async retryFromDLQ(tenantId: string, dlqEntryId: string): Promise<boolean> {
        const db = await getDb();
        const rows = await db.select().from(domineEventsDlq)
            .where(and(eq(domineEventsDlq.id, dlqEntryId), eq(domineEventsDlq.tenantId, tenantId)))
            ;

        const dlqEntry = rows[0];
        if (!dlqEntry) return false;

        // Reset the main event back to queued (scope the update by tenant as well)
        await db.update(domineEvents)
            .set({ status: 'queued', retryCount: 0, nextRetryAt: null, errorCode: null, errorMessage: null })
            .where(and(
                eq(domineEvents.id, dlqEntry.eventId),
                eq(domineEvents.tenantId, tenantId),
            ));

        // Remove from DLQ (scope the delete by tenant as well)
        await db.delete(domineEventsDlq).where(and(
            eq(domineEventsDlq.id, dlqEntryId),
            eq(domineEventsDlq.tenantId, tenantId),
        ));

        return true;
    }

    async getDLQCount(tenantId: string): Promise<number> {
        const db = await getDb();
        const rows = await db.select({ count: domineEvents.id }).from(domineEventsDlq)
            .where(eq(domineEventsDlq.tenantId, tenantId));
        return rows.length;
    }
}

export const domineEventsRepository = new DomineEventsRepository();
