
import { inboundMessages, llmEvents, intentLabels, actionEvents, freightFunnelEvents } from '../../../drizzle/schema';
import { getDb } from '../../../infra/db';
import { createHash, randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { logger } from '../../../infra/logger';

export interface SaveInboundMessageInput {
    tenantId: string;
    messageSid: string | null;
    fromNumber: string;
    bodyRaw: string;
    receivedAt?: Date;
}

export interface SaveLlmEventInput {
    tenantId: string;
    messageId: string;
    modelVersion: string;
    intentPredicted: string;
    confidence: number;
    method: string;
    latencyMs: number;
    fallbackReason?: string | null;
}

export class InboundMessageRepository {

    /**
   * Upsert inbound message handling idempotency.
   * Returns validation of the inserted/existing message ID and whether it's a new message.
   */
    async saveMessage(input: SaveInboundMessageInput): Promise<{ id: string; isNew: boolean }> {
        const db = await getDb();
        const bodyNorm = input.bodyRaw.trim().toLowerCase();

        // User requested: "inbound_messages.message_sid" based unique.
        // Fallback Hash: tenant + body + from.
        const hashContent = `${input.tenantId}:${input.fromNumber}:${input.bodyRaw}`;
        const hash = createHash('sha256').update(hashContent).digest('hex');

        const newId = randomUUID();

        try {
            // 1. Check if exists (Idempotency Check)
            const existing = await db.query.inboundMessages.findFirst({
                where: (messages, { eq, and }) => {
                    if (input.messageSid) {
                        return and(eq(messages.tenantId, input.tenantId), eq(messages.messageSid, input.messageSid));
                    }
                    return and(eq(messages.tenantId, input.tenantId), eq(messages.hash, hash));
                },
                columns: { id: true }
            });

            if (existing) {
                return { id: existing.id, isNew: false };
            }

            // 2. Insert if new
            await db.insert(inboundMessages).values({
                id: newId,
                tenantId: input.tenantId,
                messageSid: input.messageSid,
                fromNumber: input.fromNumber,
                bodyRaw: input.bodyRaw,
                bodyNorm: bodyNorm,
                hash,
                receivedAt: input.receivedAt || new Date(),
            });

            return { id: newId, isNew: true };

        } catch (error) {
            const msg = (error as Error).message;
            if (msg.includes('Duplicate entry')) {
                const retry = await db.query.inboundMessages.findFirst({
                    where: (messages, { eq, and }) => {
                        if (input.messageSid) return and(eq(messages.tenantId, input.tenantId), eq(messages.messageSid, input.messageSid));
                        return and(eq(messages.tenantId, input.tenantId), eq(messages.hash, hash));
                    },
                    columns: { id: true }
                });
                if (retry) return { id: retry.id, isNew: false };
            }

            logger.error('Failed to save inbound message', error as Error);
            throw error;
        }
    }

    async saveLlmEvent(input: SaveLlmEventInput): Promise<void> {
        const db = await getDb();
        await db.insert(llmEvents).values({
            id: randomUUID(),
            tenantId: input.tenantId,
            messageId: input.messageId,
            modelVersion: input.modelVersion,
            intentPredicted: input.intentPredicted,
            confidence: input.confidence.toString(),
            method: input.method,
            fallbackReason: input.fallbackReason,
            latencyMs: input.latencyMs,
        });
    }

    async saveLabel(messageId: string, intent: string, author: string): Promise<void> {
        const db = await getDb();
        await db.insert(intentLabels).values({
            id: randomUUID(),
            messageId,
            intent,
            author,
        });
    }

    // --- UI Support Methods ---

    async getUnlabelledMessages(limit = 10): Promise<any[]> {
        const db = await getDb();
        const labelled = await db.select({ messageId: intentLabels.messageId }).from(intentLabels);
        const ids = labelled.map(l => l.messageId);

        return db.query.inboundMessages.findMany({
            where: (msgs, { notInArray }) => ids.length > 0 ? notInArray(msgs.id, ids) : undefined,
            limit,
            orderBy: (msgs, { desc }) => [desc(msgs.receivedAt)],
        });
    }

    async getRecentEvents(limit = 50): Promise<any[]> {
        const db = await getDb();
        return db.query.llmEvents.findMany({
            limit,
            orderBy: (events, { desc }) => [desc(events.createdAt)],
        });
    }

    async getIntentStats(): Promise<any> {
        const db = await getDb();
        const [totalMessages] = await db.select({ count: sql<number>`count(*)` }).from(inboundMessages);
        const [totalLabels] = await db.select({ count: sql<number>`count(*)` }).from(intentLabels);

        const intentCounts = await db
            .select({
                intent: llmEvents.intentPredicted,
                count: sql<number>`count(*)`
            })
            .from(llmEvents)
            .groupBy(llmEvents.intentPredicted);

        return {
            totalMessages: totalMessages?.count || 0,
            totalLabels: totalLabels?.count || 0,
            intentCounts,
        };
    }

    async getGuardrailStats(): Promise<{ fallbackRate: number; avgLatency: any; accuracy: number }> {
        const db = await getDb();
        const events = await db.select().from(llmEvents);
        if (events.length === 0) return { fallbackRate: 0, avgLatency: {}, accuracy: 0 };

        // Fallback Rate
        const fallbacks = events.filter(e => e.intentPredicted === 'fallback_human').length;
        const fallbackRate = fallbacks / events.length;

        // Avg Latency by Method
        const methods = [...new Set(events.map(e => e.method))];
        const avgLatency: any = {};
        methods.forEach(m => {
            const methodEvents = events.filter(e => e.method === m);
            const sum = methodEvents.reduce((acc, curr) => acc + curr.latencyMs, 0);
            avgLatency[m] = sum / methodEvents.length;
        });

        // Accuracy (approximate logic for dashboard)
        const labels = await db.select().from(intentLabels);
        let correct = 0;
        let labeledEvents = 0;

        for (const label of labels) {
            const event = events
                .filter(e => e.messageId === label.messageId)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            if (event) {
                labeledEvents++;
                if (event.intentPredicted === label.intent) correct++;
            }
        }

        return {
            fallbackRate,
            avgLatency,
            accuracy: labeledEvents > 0 ? correct / labeledEvents : 0
        };
    }

    async saveActionEvent(input: {
        tenantId: string;
        messageId: string;
        intent: string;
        actionType: string;
        inputPayload: any;
        outputPayload: any;
        status: 'success' | 'error';
    }): Promise<void> {
        const db = await getDb();
        await db.insert(actionEvents).values({
            id: randomUUID(),
            tenantId: input.tenantId,
            messageId: input.messageId,
            intent: input.intent,
            actionType: input.actionType,
            inputPayload: input.inputPayload,
            outputPayload: input.outputPayload,
            status: input.status,
            executedAt: new Date(),
        });
    }

    async getActionEvent(messageId: string): Promise<any> {
        const db = await getDb();
        return db.query.actionEvents.findFirst({
            where: (events, { eq }) => eq(events.messageId, messageId),
        });
    }

    async saveFunnelEvent(input: {
        tenantId: string;
        phoneNumber: string;
        sessionId: string;
        stage: string;
    }): Promise<void> {
        const db = await getDb();
        try {
            await db.insert(freightFunnelEvents).values({
                id: randomUUID(),
                tenantId: input.tenantId,
                phoneNumber: input.phoneNumber,
                sessionId: input.sessionId,
                stage: input.stage,
            }).onDuplicateKeyUpdate({ set: { stage: input.stage } });
        } catch (error) {
            logger.warn('Failed to save funnel event', { error, input });
        }
    }

    async getFunnelStats(tenantId: string): Promise<any> {
        const db = await getDb();
        const stats = await db
            .select({
                stage: freightFunnelEvents.stage,
                count: sql<number>`count(*)`
            })
            .from(freightFunnelEvents)
            .where(sql`${freightFunnelEvents.tenantId} = ${tenantId}`)
            .groupBy(freightFunnelEvents.stage);

        return stats;
    }
}

export const inboundMessageRepository = new InboundMessageRepository();
