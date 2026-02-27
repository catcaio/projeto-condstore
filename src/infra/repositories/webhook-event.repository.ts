import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { webhookEvents } from '../../drizzle/schema';
import { logger } from '../logger';

// ── Types ──────────────────────────────────────────────────────────────────

export type WebhookEventStatus = 'received' | 'processed' | 'failed';

export interface WebhookEventInsert {
    provider: string;
    externalId: string;
    payloadHash: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isDuplicateEntryError(error: unknown): boolean {
    const anyError = error as { code?: string; message?: string };
    return (
        anyError?.code === 'ER_DUP_ENTRY' ||
        Boolean(anyError?.message?.includes('Duplicate entry'))
    );
}

/**
 * Computes a SHA-256 hash of the raw webhook payload for integrity tracking.
 */
export function hashPayload(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

// ── Repository ─────────────────────────────────────────────────────────────

export class WebhookEventRepository {
    /**
     * Try to insert a new webhook event (status='received').
     * Returns `true` if the event was inserted (first occurrence).
     * Returns `false` if the (provider, external_id) already exists (duplicate).
     */
    async tryInsert(data: WebhookEventInsert): Promise<boolean> {
        try {
            const db = await getDb();
            await db.insert(webhookEvents).values({
                id: randomUUID(),
                provider: data.provider,
                externalId: data.externalId,
                receivedAt: new Date(),
                payloadHash: data.payloadHash,
                status: 'received' as const,
            });
            return true;
        } catch (error) {
            if (isDuplicateEntryError(error)) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Mark a webhook event as processed (set processed_at + status='processed').
     */
    async markProcessed(provider: string, externalId: string): Promise<void> {
        try {
            const db = await getDb();
            await db
                .update(webhookEvents)
                .set({
                    processedAt: new Date(),
                    status: 'processed' as const,
                })
                .where(
                    and(
                        eq(webhookEvents.provider, provider),
                        eq(webhookEvents.externalId, externalId),
                    ),
                );
        } catch (err) {
            logger.error('webhook_event_mark_processed_failed', err as Error, {
                provider,
                externalId,
            });
        }
    }

    /**
     * Mark a webhook event as failed (status='failed').
     */
    async markFailed(provider: string, externalId: string): Promise<void> {
        try {
            const db = await getDb();
            await db
                .update(webhookEvents)
                .set({ status: 'failed' as const })
                .where(
                    and(
                        eq(webhookEvents.provider, provider),
                        eq(webhookEvents.externalId, externalId),
                    ),
                );
        } catch (err) {
            logger.error('webhook_event_mark_failed_failed', err as Error, {
                provider,
                externalId,
            });
        }
    }

    /**
     * Count total failed webhook events (for observability endpoint).
     */
    async countFailed(): Promise<number> {
        try {
            const db = await getDb();
            const result = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(webhookEvents)
                .where(eq(webhookEvents.status, 'failed'));
            return result[0]?.count ?? 0;
        } catch (err) {
            logger.error('webhook_event_count_failed_error', err as Error);
            return 0;
        }
    }
}

export const webhookEventRepository = new WebhookEventRepository();
