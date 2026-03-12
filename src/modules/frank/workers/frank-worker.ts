/**
 * Frank Async Worker.
 *
 * Polls the incoming_messages table for unprocessed messages,
 * runs them through the orchestrator, and sends responses via Twilio.
 *
 * Architecture:
 * Twilio Webhook → save to incoming_messages → respond 200 OK
 * Worker → poll unprocessed → orchestrator → Twilio API → mark processed
 */

import { getDb } from '@/infra/db';
import { incomingMessages } from '@/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';
import { handleIncomingMessage } from '../whatsapp-orchestrator';
import { twilioProvider } from '@/providers/twilio.provider';
import { logger } from '@/infra/logger';
import { isFrankRuntimeEnabled } from '@/config/app.config';

const MAX_BATCH_SIZE = 10;
const MAX_RETRIES = 3;

export interface WorkerResult {
    processed: number;
    errors: number;
}

/**
 * Process a single batch of unprocessed incoming messages.
 */
export async function processMessageBatch(): Promise<WorkerResult> {
    if (!isFrankRuntimeEnabled()) {
        return { processed: 0, errors: 0 };
    }

    const db = await getDb();

    const pending = await db.select()
        .from(incomingMessages)
        .where(eq(incomingMessages.processed, false))
        .orderBy(asc(incomingMessages.timestamp))
        .limit(MAX_BATCH_SIZE);

    if (pending.length === 0) {
        return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    for (const msg of pending) {
        try {
            const result = await handleIncomingMessage(
                msg.tenantId,
                msg.message,
                msg.phone ?? undefined,
            );

            // Send reply via Twilio
            if (msg.phone) {
                await twilioProvider.sendMessage(msg.tenantId, {
                    to: msg.phone,
                    body: result.reply,
                });
            }

            // Mark as processed
            await db.update(incomingMessages)
                .set({
                    processed: true,
                    processedAt: new Date(),
                })
                .where(and(
                    eq(incomingMessages.id, msg.id),
                    eq(incomingMessages.tenantId, msg.tenantId),
                ));

            processed++;

            logger.info('frank_worker_message_processed', {
                tenantId: msg.tenantId,
                messageId: msg.id,
                intent: result.intent,
            });
        } catch (err) {
            errors++;
            logger.error('frank_worker_message_error', err as Error, {
                tenantId: msg.tenantId,
                messageId: msg.id,
            });

            // DLQ: After too many attempts, log warning (message stays unprocessed for manual review)
        }
    }

    return { processed, errors };
}

/**
 * Enqueue an incoming message for async processing.
 */
export async function enqueueIncomingMessage(data: {
    tenantId: string;
    sessionId: string;
    message: string;
    phone?: string;
    twilioPayload?: Record<string, unknown>;
}): Promise<string> {
    if (!isFrankRuntimeEnabled()) {
        logger.info('frank_worker_enqueue_skipped', { tenantId: data.tenantId, reason: 'runtime_disabled' });
        return 'noop';
    }

    const db = await getDb();
    const { randomUUID } = await import('crypto');
    const id = randomUUID();

    await db.insert(incomingMessages).values({
        id,
        tenantId: data.tenantId,
        sessionId: data.sessionId,
        message: data.message,
        phone: data.phone ?? null,
        twilioPayload: data.twilioPayload ?? null,
        processed: false,
    });

    logger.info('frank_worker_message_enqueued', {
        tenantId: data.tenantId,
        messageId: id,
        sessionId: data.sessionId,
    });

    return id;
}
