import { getDb } from '@/infra/db';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import {
    conversations,
    conversationMessages,
    customers,
    orders,
    simulations,
    crmTasks,
    crmNotes,
    customerContacts,
} from '@/drizzle/schema';
import { decryptString } from '@/infra/pii/crypto';
import { logger } from '@/infra/logger';

export interface FrankContextPayload {
    conversation: {
        id: string;
        stage: string | null;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: string;
        }>;
    };
    customer: {
        id: string | null;
        name: string;
        totalOrders: number;
        totalQuotes: number;
        averageTicket: number;
    } | null;
    pipeline: {
        recentQuotes: Array<{ id: string; status: string; total: string; date: string; expiresAt: string | null; isExpired: boolean }>;
        recentOrders: Array<{ id: string; status: string; total: string; date: string }>;
    };
    operacional: {
        ownerId: string | null;
        openTasks: Array<{ id: string; title: string; status: string; dueAt: string | null; isOverdue: boolean }>;
        recentNotes: number;
    };
}

export const frankContextBuilder = {
    async buildContext(tenantId: string, conversationId: string): Promise<FrankContextPayload> {
        const db = await getDb();

        // 1. Load Conversation Base
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
            .limit(1);

        if (!conversation) {
            throw new Error(`Conversation not found or access denied: ${conversationId}`);
        }

        // 2. Load Timeline Messages (Limit 20 for token safety)
        const recentMessages = await db
            .select()
            .from(conversationMessages)
            .where(and(
                eq(conversationMessages.tenantId, tenantId),
                eq(conversationMessages.conversationId, conversationId)
            ))
            .orderBy(desc(conversationMessages.createdAt))
            .limit(20);

        // Reverse to chronological order
        recentMessages.reverse();

        const formattedMessages = recentMessages.map((msg) => {
            let role: 'user' | 'assistant' | 'system' = 'user';
            
            if (msg.direction === 'outbound') {
                if (msg.source === 'SYSTEM') role = 'system';
                else role = 'assistant';
            } else {
                role = 'user';
            }

            return {
                role,
                content: msg.message,
                timestamp: msg.createdAt.toISOString()
            };
        });

        // 3. Customer Base Context
        let customerContext = null;
        let recentQuotes: any[] = [];
        let recentOrders: any[] = [];
        let openTasks: any[] = [];
        let recentNotes = 0;

        if (conversation.customerId) {
            const [customer] = await db
                .select()
                .from(customers)
                .where(and(eq(customers.tenantId, tenantId), eq(customers.id, conversation.customerId)))
                .limit(1);

            if (customer) {
                // Fetch primary contact name
                const [contact] = await db
                    .select()
                    .from(customerContacts)
                    .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.customerId, customer.id)))
                    .orderBy(desc(customerContacts.isPrimary))
                    .limit(1);

                const customerName = contact ? contact.name : 'Cliente Registrado';

                // Quotes & Orders history
                const dbQuotes = await db
                    .select()
                    .from(simulations)
                    .where(and(eq(simulations.tenantId, tenantId), eq(simulations.customerId, customer.id)))
                    .orderBy(desc(simulations.createdAt))
                    .limit(5);

                const dbOrders = await db
                    .select()
                    .from(orders)
                    .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, customer.id)))
                    .orderBy(desc(orders.createdAt))
                    .limit(5);

                // Quick aggregations
                const confirmedOrders = dbOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERED');
                const totalRevenue = confirmedOrders.reduce((acc, curr) => acc + Number(curr.totalAmount || curr.price || 0), 0);
                
                customerContext = {
                    id: customer.id,
                    name: customerName,
                    totalOrders: confirmedOrders.length,
                    totalQuotes: dbQuotes.length,
                    averageTicket: confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0,
                };

                recentQuotes = dbQuotes.map((q) => {
                    const isExpired = q.expiresAt ? new Date() > q.expiresAt : false;
                    return {
                        id: q.id,
                        status: q.status || 'DRAFT',
                        total: String(q.totalAmount || q.bestPrice || 0),
                        date: q.createdAt.toISOString(),
                        expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
                        isExpired
                    };
                });

                recentOrders = dbOrders.map((o) => ({
                    id: o.id,
                    status: o.status,
                    total: String(o.totalAmount || o.price || 0),
                    date: o.createdAt.toISOString()
                }));

                // Operational Data
                const tasks = await db.select().from(crmTasks).where(and(
                    eq(crmTasks.tenantId, tenantId),
                    eq(crmTasks.customerId, customer.id),
                    or(eq(crmTasks.status, 'OPEN'), isNull(crmTasks.status))
                ));
                openTasks = tasks.map((t) => {
                    const isOverdue = t.dueAt ? new Date() > t.dueAt : false;
                    return {
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
                        isOverdue
                    };
                });

                const notes = await db.select().from(crmNotes).where(and(
                    eq(crmNotes.tenantId, tenantId),
                    eq(crmNotes.customerId, customer.id)
                )).limit(10);
                recentNotes = notes.length;
            }
        }

        return {
            conversation: {
                id: conversation.id,
                stage: conversation.stage,
                messages: formattedMessages
            },
            customer: customerContext,
            pipeline: {
                recentQuotes,
                recentOrders
            },
            operacional: {
                ownerId: conversation.assignedTo || null,
                openTasks,
                recentNotes
            }
        };
    }
};
