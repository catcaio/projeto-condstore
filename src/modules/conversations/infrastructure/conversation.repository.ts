import { eq, and, desc, sql, inArray, gt, asc, ne } from 'drizzle-orm';
import { getDb, withTenantNotDeleted } from '@/infra/db';
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
    type ConversationStatusType,
    type MessageDeliveryStatusType,
} from '@/drizzle/schema';

export interface ConversationListFilter {
    status?: string | string[];
    assignedTo?: string;
    channel?: string;
    phoneSearch?: string;
    limit?: number;
    offset?: number;
}

function extractAffectedRows(result: unknown): number {
    if (Array.isArray(result)) {
        const first = result[0] as { affectedRows?: number; rowsAffected?: number } | undefined;
        if (typeof first?.affectedRows === 'number') return first.affectedRows;
        if (typeof first?.rowsAffected === 'number') return first.rowsAffected;
        return 0;
    }

    const value = result as { affectedRows?: number; rowsAffected?: number } | undefined;
    if (typeof value?.affectedRows === 'number') return value.affectedRows;
    if (typeof value?.rowsAffected === 'number') return value.rowsAffected;
    return 0;
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
                    inArray(conversations.status, ['new', 'triaged', 'awaiting_human', 'operator_active', 'draft_ready', 'approved', 'sent', 'delivered'])
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
            status: 'new',
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
                conditions.push(inArray(conversations.status, filter.status as any));
            } else {
                conditions.push(eq(conversations.status, filter.status as any));
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
     * If `since` is provided (e.g. from a recent explicit release/handback),
     * only operator messages sent strictly after the later of `cutoff` and `since` are considered.
     */
    async hasRecentOperatorMessage(
        tenantId: string,
        conversationId: string,
        minutes: number = 15,
        since?: Date | null
    ): Promise<boolean> {
        const db = await getDb();
        const windowCutoff = new Date(Date.now() - minutes * 60 * 1000);
        const effectiveCutoff = since && since.getTime() > windowCutoff.getTime() ? since : windowCutoff;

        const rows = await db.select({ id: conversationMessages.id })
            .from(conversationMessages)
            .where(and(
                eq(conversationMessages.tenantId, tenantId),
                eq(conversationMessages.conversationId, conversationId),
                eq(conversationMessages.source, 'OPERATOR'),
                gt(conversationMessages.createdAt, effectiveCutoff)
            ))
            .limit(1);

        return rows.length > 0;
    },

    /**
     * Retrieves the timestamp of the latest explicit release/handback action
     * recorded in conversationAssignments for this conversation.
     */
    async getLastReleaseTimestamp(tenantId: string, conversationId: string): Promise<Date | null> {
        const db = await getDb();
        const [lastRelease] = await db.select({ createdAt: conversationAssignments.createdAt })
            .from(conversationAssignments)
            .where(and(
                eq(conversationAssignments.tenantId, tenantId),
                eq(conversationAssignments.conversationId, conversationId),
                eq(conversationAssignments.assignedTo, 'UNASSIGNED')
            ))
            .orderBy(desc(conversationAssignments.createdAt))
            .limit(1);

        return lastRelease?.createdAt ?? null;
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
            direction: 'inbound',
            source: 'WHATSAPP',
            message,
            metadata: metadata || null,
            providerMessageId: providerMessageId || null,
            deliveryStatus: 'delivered', // Inbound messages are implicitly delivered
        });

        await db.update(conversations)
            .set({
                lastMessageAt: sql`CURRENT_TIMESTAMP`,
                status: 'awaiting_human'
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
            direction: 'outbound',
            source,
            message,
            metadata: metadata || null,
            deliveryStatus: 'queued' // Wait for TWILIO to change this explicitly
        });

        if (advanceConversation) {
            await db.update(conversations)
                .set({
                    lastMessageAt: sql`CURRENT_TIMESTAMP`,
                    status: 'sent'
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

    /**
     * Atomically releases a conversation back to automated queue / Frank:
     * sets assignedTo = null, status = 'triaged' (valid enum value),
     * and records the unassignment event in conversationAssignments.
     */
    async releaseConversation(
        tenantId: string,
        conversationId: string,
        releasedBy?: string
    ): Promise<boolean> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');

        // Execute in database transaction when supported, or sequential update with affected row check
        const executeAtomicRelease = async (tx: any) => {
            const result = await tx.update(conversations)
                .set({
                    assignedTo: null,
                    status: 'triaged' as ConversationStatusType,
                })
                .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));

            const affected = extractAffectedRows(result);
            if (affected === 0) {
                return false;
            }

            await tx.insert(conversationAssignments).values({
                id: randomUUID(),
                tenantId,
                conversationId,
                assignedTo: 'UNASSIGNED',
                assignedBy: releasedBy || null,
            });

            return true;
        };

        if (typeof (db as any).transaction === 'function') {
            return (db as any).transaction(executeAtomicRelease);
        }

        return executeAtomicRelease(db);
    },

    async updateConversationStatus(
        tenantId: string,
        conversationId: string,
        status: ConversationStatusType
    ): Promise<void> {
        const db = await getDb();
        await db.update(conversations)
            .set({ status })
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)));
    },

    async updateConversationStage(
        tenantId: string,
        conversationId: string,
        expectedVersion: number,
        stage: 'NEW_LEAD' | 'IN_ATTENDANCE' | 'QUOTED' | 'WON' | 'LOST',
        lostReason?: string
    ): Promise<boolean> {
        const db = await getDb();
        const result = await db.update(conversations)
            .set({
                stage,
                version: sql`${conversations.version} + 1`,
                ...(lostReason ? { lostReason } : {}),
            })
            .where(
                and(
                    eq(conversations.tenantId, tenantId),
                    eq(conversations.id, conversationId),
                    eq(conversations.version, expectedVersion)
                )
            );

        return extractAffectedRows(result) > 0;
    },

    async getConversationMessages(tenantId: string, conversationId: string): Promise<ConversationMessageRecord[]> {
        const db = await getDb();
        return db.select()
            .from(conversationMessages)
            .where(and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.conversationId, conversationId)))
            .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id));
    },

    async getConversationMessageByProviderMessageId(messageSid: string): Promise<ConversationMessageRecord | undefined> {
        const normalizedMessageSid = messageSid.trim();
        if (!normalizedMessageSid) return undefined;

        const db = await getDb();
        const [message] = await db.select()
            .from(conversationMessages)
            .where(eq(conversationMessages.providerMessageId, normalizedMessageSid))
            .limit(1);

        return message;
    },

    async updateConversationMessageFields(
        tenantId: string,
        messageId: string,
        fields: {
            metadata?: Record<string, any>;
            providerMessageId?: string | null;
            deliveryStatus?: MessageDeliveryStatusType | null;
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
                status: 'sent',
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
            .where(withTenantNotDeleted(orders, tenantId, eq(orders.conversationId, conversation.id)))
            .orderBy(desc(orders.createdAt)).limit(1);

        const [lastQuote] = lastOrder?.freightSimulationId
            ? await db.select().from(freightSimulations)
                .where(and(eq(freightSimulations.tenantId, tenantId), eq(freightSimulations.id, lastOrder.freightSimulationId)))
                .orderBy(desc(freightSimulations.createdAt)).limit(1)
            : [null as any];

        const [shipment] = lastOrder
            ? await db.select().from(shipments)
                .where(withTenantNotDeleted(shipments, tenantId, eq(shipments.orderId, lastOrder.id)))
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
