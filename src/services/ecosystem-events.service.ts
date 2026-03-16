import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { ecosystemEvents } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

// --- Event Types ---

export const EcosystemEventTypes = [
    'lead_created',
    'lead_stage_changed',
    'order_created',
    'order_paid',
    'shipment_created',
    'shipment_delayed',
    'message_received',
    'quote_generated',
    'note_added',
    'followup_scheduled',
] as const;

export type EcosystemEventType = typeof EcosystemEventTypes[number];

// --- In-process subscribers ---

type EventHandler = (event: {
    id: string;
    type: string;
    entityType: string;
    entityId: string | null;
    payload: Record<string, unknown>;
    actor: string;
    source: string;
}) => void | Promise<void>;

const subscribers = new Map<string, EventHandler[]>();

// --- Service ---

export const ecosystemEventsService = {
    /**
     * Emit an ecosystem event: persist to DB + notify in-process subscribers.
     */
    async emitEvent(params: {
        tenantId: string;
        type: EcosystemEventType;
        entityType: string;
        entityId?: string;
        payload: Record<string, unknown>;
        actor: string;
        source: string;
    }): Promise<string> {
        const id = randomUUID();
        const db = await getDb();

        try {
            await db.insert(ecosystemEvents).values({
                id,
                tenantId: params.tenantId,
                type: params.type,
                entityType: params.entityType,
                entityId: params.entityId ?? null,
                payloadJson: params.payload,
                actor: params.actor,
                source: params.source,
            });

            // Notify in-process subscribers (fire-and-forget to avoid blocking the caller)
            const handlers = subscribers.get(params.type) ?? [];
            const allHandlers = [...handlers, ...(subscribers.get('*') ?? [])];
            for (const handler of allHandlers) {
                try {
                    await handler({
                        id,
                        type: params.type,
                        entityType: params.entityType,
                        entityId: params.entityId ?? null,
                        payload: params.payload,
                        actor: params.actor,
                        source: params.source,
                    });
                } catch (err) {
                    logger.error('ecosystem_event_subscriber_error', err as Error, { type: params.type, id });
                }
            }

            logger.info('ecosystem_event_emitted', { type: params.type, entityType: params.entityType, entityId: params.entityId, id });
            return id;
        } catch (err) {
            logger.error('ecosystem_event_emit_failed', err as Error, { type: params.type });
            throw err;
        }
    },

    /**
     * Query events with optional filters.
     */
    async getEvents(params: {
        tenantId: string;
        type?: string;
        entityType?: string;
        entityId?: string;
        from?: Date;
        to?: Date;
        limit?: number;
        offset?: number;
    }) {
        const db = await getDb();
        const conditions = [eq(ecosystemEvents.tenantId, params.tenantId)];

        if (params.type) conditions.push(eq(ecosystemEvents.type, params.type));
        if (params.entityType) conditions.push(eq(ecosystemEvents.entityType, params.entityType));
        if (params.entityId) conditions.push(eq(ecosystemEvents.entityId, params.entityId));
        if (params.from) conditions.push(gte(ecosystemEvents.createdAt, params.from));
        if (params.to) conditions.push(lte(ecosystemEvents.createdAt, params.to));

        const rows = await db
            .select()
            .from(ecosystemEvents)
            .where(and(...conditions))
            .orderBy(desc(ecosystemEvents.createdAt))
            .limit(params.limit ?? 50)
            .offset(params.offset ?? 0);

        return rows;
    },

    /**
     * Register an in-process event subscriber. Use '*' to subscribe to all events.
     */
    subscribe(type: EcosystemEventType | '*', handler: EventHandler): () => void {
        const existing = subscribers.get(type) ?? [];
        existing.push(handler);
        subscribers.set(type, existing);

        // Return unsubscribe function
        return () => {
            const arr = subscribers.get(type);
            if (arr) {
                const idx = arr.indexOf(handler);
                if (idx >= 0) arr.splice(idx, 1);
            }
        };
    },
};
