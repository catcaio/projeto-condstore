import { eq, and, desc, sql, inArray, gt, asc, ne } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    conversations,
    conversationMessages,
    conversationAssignments,
    customerContacts,
    customers,
    organizations,
    orders,
    shipments,
    freightSimulations,
    type ConversationRecord,
    type ConversationMessageRecord,
} from '@/drizzle/schema';

export interface ConversationListFilter {
    status?: string | string[];
    assignedTo?: string;
    channel?: string;
    phoneSearch?: string;
    limit?: number;
    offset?: number;
}

export const conversationRepository = {
    async findOrCreateConversationByPhone(
        tenantId: string,
        phoneHash: string,
        phoneEncrypted: string,
        identity?: { customerId?: string | null; organizationId?: string | null }
    ): Promise<ConversationRecord> {
        const db = await getDb();

        const [existing] = await db.select()
            .from(conversations)
            .where(
                and(
                    eq(conversations.tenantId, tenantId),
                    eq(conversations.phoneHash, phoneHash),
                    inArray(conversations.status, ['OPEN', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'HUMAN_ACTIVE'])
                )
            )
            .orderBy(desc(conversations.lastMessageAt))
            .limit(1);

        if (existing) {
            if (!existing.customerId && identity?.customerId) {
                await db.update(conversations)
                    .set({
                        customerId: identity.customerId,
                        organizationId: identity.organizationId ?? null,
                    })
                    .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, existing.id)));

                const [updated] = await db.select().from(conversations)
                    .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, existing.id)))
                    .limit(1);

                if (updated) return updated;
            }

            return existing;
        }

        const { randomUUID } = await import('crypto');
        const id = randomUUID();

        await db.insert(conversations).values({
            id,
            tenantId,
            phoneHash,
            phoneEncrypted,
            customerId: identity?.customerId ?? null,
            organizationId: identity?.organizationId ?? null,
            status: 'OPEN',
            channel: 'WHATSAPP',
            assignedTo: null,
        });

        const [newConv] = await db.select()
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, id)))
            .limit(1);

        if (!newConv) throw new Error('Failed to create conversation');
        return newConv;
    },

    async listConversations(tenantId: string, filter: ConversationListFilter): Promise<ConversationRecord[]> {
        const db = await getDb();
        const conditions = [eq(conversations.tenantId, tenantId)];

        if (filter.status) {
            if (Array.isArray(filter.status)) {
                conditions.push(inArray(conversations.status, filter.status));
            } else {
                conditions.push(eq(conversations.status, filter.status));
            }
        }
        if (filter.assignedTo !== undefined) {
            if (filter.assignedTo === 'UNASSIGNED') {
                conditions.push(sql`${conversations.assignedTo} IS NULL`);
            } else {
                conditions.push(eq(conversations.assignedTo, filter.assignedTo));
            }
        }
        if (filter.channel) {
            conditions.push(eq(conversations.channel, filter.channel));
        }
        if (filter.phoneSearch) {
            conditions.push(eq(conversations.phoneHash, filter.phoneSearch));
        }

        return db.select()
            .from(conversations)
            .where(and(...conditions))
            .orderBy(desc(conversations.lastMessageAt))
            .limit(Math.min(filter.limit || 50, 100))
            .offset(filter.offset || 0);
    },

    async getConversationById(tenantId: string, conversationId: string): Promise<ConversationRecord | undefined> {
        const db = await getDb();
        const [conv] = await db.select()
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
            .limit(1);
        return conv;
    },

    /**
     * Checks if an operator has sent any message in the last N minutes.
     */
    async hasRecentOperatorMessage(tenantId: string, conversationId: string, minutes: number = 15): Promise<boolean> {
        const db = await getDb();
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);

        const rows = await db.select({ id: conversationMessages.id })
            .from(conversationMessages)
            .where(and(
                eq(conversationMessages.tenantId, tenantId),
                eq(conversationMessages.conversationId, conversationId),
                eq(conversationMessages.source, 'OPERATOR'),
                gt(conversationMessages.createdAt, cutoff)
            ))
            .limit(1);

        return rows.length > 0;
    },

    async appendInboundMessage(
        tenantId: string,
        conversationId: string,
        message: string,
        metadata?: Record<string, any>,
        providerMessageId?: string
    ): Promise<ConversationMessageRecord> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');
        const id = randomUUID();

        await db.insert(conversationMessages).values({
            id,
            tenantId,
            conversationId,
            direction: 'INBOUND',
            source: 'WHATSAPP',
            message,
            metadata: metadata || null,
            providerMessageId: providerMessageId || null,
            deliveryStatus: 'delivered', // Inbound messages are implicitly delivered
        });

        await db.update(conversations)
            .set({
                lastMessageAt: sql`CURRENT_TIMESTAMP`,
                status: 'WAITING_INTERNAL'
            })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));

        const [newMsg] = await db.select()
            .from(conversationMessages)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.id, id)))
            .limit(1);

        if (!newMsg) throw new Error('Failed to insert inbound message');
        return newMsg;
    },

    async appendOutboundMessage(
        tenantId: string,
        conversationId: string,
        message: string,
        source: 'OPERATOR' | 'SYSTEM' = 'OPERATOR',
        metadata?: Record<string, any>,
        options?: { advanceConversation?: boolean }
    ): Promise<ConversationMessageRecord> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const advanceConversation = options?.advanceConversation ?? true;

        await db.insert(conversationMessages).values({
            id,
            tenantId,
            conversationId,
            direction: 'OUTBOUND',
            source,
            message,
            metadata: metadata || null,
            deliveryStatus: 'queued' // Wait for TWILIO to change this explicitly
        });

        if (advanceConversation) {
            await db.update(conversations)
                .set({
                    lastMessageAt: sql`CURRENT_TIMESTAMP`,
                    status: 'WAITING_CUSTOMER'
                })
                .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
        }

        const [newMsg] = await db.select()
            .from(conversationMessages)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.id, id)))
            .limit(1);

        if (!newMsg) throw new Error('Failed to insert outbound message');
        return newMsg;
    },

    async assignConversation(
        tenantId: string,
        conversationId: string,
        assignedTo: string,
        assignedBy?: string
    ): Promise<void> {
        const db = await getDb();

        await db.update(conversations)
            .set({ assignedTo })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));

        const { randomUUID } = await import('crypto');
        await db.insert(conversationAssignments).values({
            id: randomUUID(),
            tenantId,
            conversationId,
            assignedTo,
            assignedBy: assignedBy || null,
        });
    },

    async unassignConversation(
        tenantId: string,
        conversationId: string
    ): Promise<void> {
        const db = await getDb();

        await db.update(conversations)
            .set({ assignedTo: null })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
    },

    async updateConversationStatus(
        tenantId: string,
        conversationId: string,
        status: 'OPEN' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED' | 'HUMAN_ACTIVE'
    ): Promise<void> {
        const db = await getDb();
        await db.update(conversations)
            .set({ status })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
    },

    async updateConversationStage(
        tenantId: string,
        conversationId: string,
        stage: 'NEW_LEAD' | 'IN_ATTENDANCE' | 'QUOTED' | 'WON' | 'LOST',
        lostReason?: string
    ): Promise<void> {
        const db = await getDb();
        await db.update(conversations)
            .set({ stage, ...(lostReason ? { lostReason } : {}) })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
    },

    async getConversationMessages(tenantId: string, conversationId: string): Promise<ConversationMessageRecord[]> {
        const db = await getDb();
        return db.select()
            .from(conversationMessages)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.conversationId, conversationId)))
            .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id));
    },

    async updateConversationMessageFields(
        tenantId: string,
        messageId: string,
        fields: {
            metadata?: Record<string, any>;
            providerMessageId?: string | null;
            deliveryStatus?: string | null;
        }
    ): Promise<ConversationMessageRecord | undefined> {
        const db = await getDb();

        const updateData: any = {};
        if (fields.metadata !== undefined) updateData.metadata = fields.metadata;
        if (fields.providerMessageId !== undefined) updateData.providerMessageId = fields.providerMessageId;
        if (fields.deliveryStatus !== undefined) updateData.deliveryStatus = fields.deliveryStatus;

        await db.update(conversationMessages)
            .set(updateData)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.id, messageId)));

        const [updatedMessage] = await db.select()
            .from(conversationMessages)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.id, messageId)))
            .limit(1);

        return updatedMessage;
    },

    async markConversationWaitingCustomer(tenantId: string, conversationId: string): Promise<void> {
        const db = await getDb();
        await db.update(conversations)
            .set({
                lastMessageAt: sql`CURRENT_TIMESTAMP`,
                status: 'WAITING_CUSTOMER',
            })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
    },


    async loadConversationContext(tenantId: string, conversationId: string) {
        const db = await getDb();
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
            .limit(1);

        if (!conversation) return null;

        const [contact] = conversation.customerId
            ? await db.select().from(customerContacts).where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.customerId, conversation.customerId))).limit(1)
            : [null as any];

        const [organization] = conversation.organizationId
            ? await db.select().from(organizations).where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, conversation.organizationId), ne(organizations.status, 'merged'))).limit(1)
            : [null as any];

        const [lastOrder] = await db.select().from(orders)
            .where(and(eq(orders.tenantId, tenantId), eq(orders.conversationId, conversation.id)))
            .orderBy(desc(orders.createdAt)).limit(1);

        const [lastQuote] = lastOrder?.freightSimulationId
            ? await db.select().from(freightSimulations)
                .where(and(eq(freightSimulations.tenantId, tenantId), eq(freightSimulations.id, lastOrder.freightSimulationId)))
                .orderBy(desc(freightSimulations.createdAt)).limit(1)
            : [null as any];

        const [shipment] = lastOrder
            ? await db.select().from(shipments)
                .where(and(eq(shipments.tenantId, tenantId), eq(shipments.orderId, lastOrder.id)))
                .orderBy(desc(shipments.createdAt)).limit(1)
            : [null as any];

        return {
            conversation,
            contact: contact ?? null,
            organization: organization ?? null,
            lastQuote: lastQuote ?? null,
            lastOrder: lastOrder ?? null,
            shipment: shipment ?? null,
        };
    },
};
