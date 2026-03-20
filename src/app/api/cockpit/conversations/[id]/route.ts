import { and, desc, eq, sql, or, isNull, ne } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb, withTenantIdNotDeleted, withTenantNotDeleted } from '@/infra/db';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';
import {
    customerContacts,
    customers,
    freightSimulations,
    frankSessionState,
    orders,
    organizations,
    shipments,
    simulations,
    crmNotes,
    crmTasks
} from '@/drizzle/schema';
import { conversationService } from '@/modules/atendimento/conversation.service';

export const revalidate = 0;

function presentOrganization<T extends { tradeName: string | null; legalName: string }>(organization: T | null) {
    if (!organization) return null;
    return {
        ...organization,
        name: organization.tradeName ?? organization.legalName,
    };
}

function presentCustomer(params: {
    customerId: string | null;
    contact: { name: string; customerId: string } | null;
    organization: { tradeName: string | null; legalName: string } | null;
}) {
    if (!params.customerId && !params.contact && !params.organization) {
        return null;
    }

    return {
        id: params.customerId ?? params.contact?.customerId ?? null,
        name: params.contact?.name ?? params.organization?.tradeName ?? params.organization?.legalName ?? 'Cliente',
    };
}

async function loadFrankSessionSafely(tenantId: string, phoneHash: string | null, requestId: string) {
    if (!phoneHash) return null;

    try {
        const db = await getDb();
        const [frankSession] = await db
            .select()
            .from(frankSessionState)
            .where(
                and(
                    eq(frankSessionState.tenantId, tenantId),
                    eq(frankSessionState.sessionId, phoneHash),
                ),
            )
            .limit(1);

        return frankSession ?? null;
    } catch (error) {
        logger.warn('conversation_details_frank_session_unavailable', {
            requestId,
            tenantId,
            phoneHash,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

function safeDecryptConversationPhone(phoneEncrypted: string, requestId: string, conversationId: string) {
    try {
        return decryptString(phoneEncrypted);
    } catch (error) {
        logger.warn('conversation_details_phone_unavailable', {
            requestId,
            conversationId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { id: conversationId } = await context.params;

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const messages = await conversationService.getConversationMessages(tenantId, conversationId);
        const db = await getDb();
        let frankSession: Awaited<ReturnType<typeof loadFrankSessionSafely>> = null;
        let contact: typeof customerContacts.$inferSelect | null = null;
        let organizationRecord: typeof organizations.$inferSelect | null = null;
        let lastOrder: typeof orders.$inferSelect | null = null;
        let lastQuote: typeof freightSimulations.$inferSelect | null = null;
        let shipment: typeof shipments.$inferSelect | null = null;
        let resolvedCustomerId: string | null = conversation.customerId ?? null;
        let resolvedOrganizationId: string | null = conversation.organizationId ?? null;
        let dbCustomer: typeof customers.$inferSelect | null = null;
        let totalOrders = 0;
        let totalQuotes = 0;
        let totalRevenue = 0;
        let lastOrderAt: Date | null = null;
        let lastQuotedAt: Date | null = null;
        let purchasedProducts: any[] = [];
        let recentNotes: typeof crmNotes.$inferSelect[] = [];
        let upcomingTasks: typeof crmTasks.$inferSelect[] = [];

        try {
            frankSession = await loadFrankSessionSafely(tenantId, conversation.phoneHash, requestId);

            const [contactResult] = conversation.phoneHash
                ? await db
                    .select()
                    .from(customerContacts)
                    .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.phoneHash, conversation.phoneHash)))
                    .limit(1)
                : conversation.customerId
                    ? await db
                        .select()
                        .from(customerContacts)
                        .where(
                            and(
                                eq(customerContacts.tenantId, tenantId),
                                eq(customerContacts.customerId, conversation.customerId),
                            ),
                        )
                        .limit(1)
                    : [];
            contact = contactResult ?? null;

            resolvedCustomerId = conversation.customerId ?? contact?.customerId ?? frankSession?.customerId ?? null;
            resolvedOrganizationId =
                conversation.organizationId ?? contact?.organizationId ?? frankSession?.organizationId ?? null;

            const [organizationResult] = resolvedOrganizationId
                ? await db
                    .select()
                    .from(organizations)
                    .where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, resolvedOrganizationId), ne(organizations.status, 'merged')))
                    .limit(1)
                : [];
            organizationRecord = organizationResult ?? null;

            const [customerResult] = resolvedCustomerId
                ? await db
                    .select()
                    .from(customers)
                    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, resolvedCustomerId)))
                    .limit(1)
                : [];
            dbCustomer = customerResult ?? null;

            if (resolvedCustomerId) {
                const [ordersStats] = await db.select({ 
                    count: sql<number>`count(*)`,
                    revenue: sql<number>`sum(${orders.price})`,
                    lastOrderAt: sql<Date>`max(${orders.createdAt})`
                }).from(orders)
                .where(withTenantNotDeleted(orders, tenantId, eq(orders.customerId, resolvedCustomerId), eq(orders.status, 'CONFIRMED')));

                totalOrders = Number(ordersStats?.count ?? 0);
                totalRevenue = Number(ordersStats?.revenue ?? 0);
                lastOrderAt = ordersStats?.lastOrderAt ?? null;

                const [quotesStats] = await db.select({
                    count: sql<number>`count(*)`,
                    lastQuotedAt: sql<Date>`max(${simulations.createdAt})`
                }).from(simulations)
                .where(and(eq(simulations.tenantId, tenantId), eq(simulations.customerId, resolvedCustomerId)));

                totalQuotes = Number(quotesStats?.count ?? 0);
                lastQuotedAt = quotesStats?.lastQuotedAt ?? null;

                const recentPurchasedItems = await db.select({
                    items: simulations.items,
                }).from(orders)
                  .innerJoin(simulations, eq(orders.quoteId, simulations.id))
                  .where(withTenantNotDeleted(orders, tenantId, eq(orders.customerId, resolvedCustomerId), eq(orders.status, 'CONFIRMED')))
                  .orderBy(desc(orders.createdAt))
                  .limit(5);

                purchasedProducts = recentPurchasedItems.map(row => row.items).flat().filter(Boolean);

                recentNotes = await db.select().from(crmNotes)
                    .where(withTenantNotDeleted(crmNotes, tenantId, eq(crmNotes.customerId, resolvedCustomerId)))
                    .orderBy(desc(crmNotes.createdAt))
                    .limit(5);

                upcomingTasks = await db.select().from(crmTasks)
                    .where(
                        withTenantNotDeleted(
                            crmTasks,
                            tenantId,
                            eq(crmTasks.customerId, resolvedCustomerId),
                            or(eq(crmTasks.status, 'OPEN'), isNull(crmTasks.status)),
                        ),
                    )
                    // Ordering by dueAt conceptually. Simple string mapped if nulls first/last allowed, or simple code ordering.
                    .orderBy(desc(crmTasks.createdAt))
                    .limit(10);
            }

            const [lastOrderResult] = frankSession?.lastOrderId
                ? await db
                    .select()
                    .from(orders)
                    .where(withTenantIdNotDeleted(orders, tenantId, frankSession.lastOrderId))
                    .limit(1)
                : resolvedCustomerId
                    ? await db
                        .select()
                        .from(orders)
                        .where(withTenantNotDeleted(orders, tenantId, eq(orders.customerId, resolvedCustomerId)))
                        .orderBy(desc(orders.createdAt))
                        .limit(1)
                    : await db
                        .select()
                        .from(orders)
                        .where(withTenantNotDeleted(orders, tenantId, eq(orders.conversationId, conversationId)))
                        .orderBy(desc(orders.createdAt))
                        .limit(1);
            lastOrder = lastOrderResult ?? null;

            const [lastQuoteResult] = frankSession?.lastReferencedQuoteId
                ? await db
                    .select()
                    .from(freightSimulations)
                    .where(
                        and(
                            eq(freightSimulations.tenantId, tenantId),
                            eq(freightSimulations.id, frankSession.lastReferencedQuoteId),
                        ),
                    )
                    .limit(1)
                : lastOrder?.freightSimulationId
                    ? await db
                        .select()
                        .from(freightSimulations)
                        .where(
                            and(
                                eq(freightSimulations.tenantId, tenantId),
                                eq(freightSimulations.id, lastOrder.freightSimulationId),
                            ),
                        )
                        .limit(1)
                    : [];
            lastQuote = lastQuoteResult ?? null;

            const [shipmentResult] = frankSession?.lastReferencedShipmentId
                ? await db
                    .select()
                    .from(shipments)
                    .where(withTenantIdNotDeleted(shipments, tenantId, frankSession.lastReferencedShipmentId))
                    .limit(1)
                : lastOrder
                    ? await db
                        .select()
                        .from(shipments)
                        .where(withTenantNotDeleted(shipments, tenantId, eq(shipments.orderId, lastOrder.id)))
                        .orderBy(desc(shipments.updatedAt))
                        .limit(1)
                    : [];
            shipment = shipmentResult ?? null;
        } catch (error) {
            logger.warn('conversation_details_context_unavailable', {
                requestId,
                tenantId,
                conversationId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        const [organizationResult] = resolvedOrganizationId
            ? await db
                .select()
                .from(organizations)
                .where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, resolvedOrganizationId), ne(organizations.status, 'merged')))
                .limit(1)
            : [];
        organizationRecord = organizationResult ?? null;

        const conversationQuotes = await db.select().from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), eq(simulations.conversationId, conversationId)))
            .orderBy(desc(simulations.createdAt));
            
        const conversationOrders = await db.select().from(orders)
            .where(withTenantNotDeleted(orders, tenantId, eq(orders.conversationId, conversationId)))
            .orderBy(desc(orders.createdAt));

        const organization = presentOrganization(organizationRecord ?? null);
        const customer = presentCustomer({
            customerId: resolvedCustomerId,
            contact: contact ?? null,
            organization: organizationRecord ?? null,
        });

        const plaintextPhone = safeDecryptConversationPhone(conversation.phoneEncrypted, requestId, conversationId);
        const { phoneEncrypted, ...safeConversation } = conversation;

        return NextResponse.json({
            ok: true,
            data: {
                conversation: {
                    ...safeConversation,
                    phone: plaintextPhone,
                    customer,
                    contact,
                    organization,
                    recentOrders: lastOrder ? [lastOrder] : [],
                    recentQuotes: lastQuote ? [lastQuote] : [],
                    quoteContext: conversationQuotes.map(q => ({
                        quoteId: q.id,
                        status: q.status || 'DRAFT',
                        total: Number(q.totalAmount || q.bestPrice || 0),
                        discountAmount: Number(q.discountAmount || 0),
                        quantity: q.quantity,
                        itemCount: Array.isArray(q.items) ? q.items.length : 0,
                        createdAt: q.createdAt,
                        updatedAt: q.updatedAt,
                        sentAt: q.sentAt,
                        expiresAt: q.expiresAt,
                        isExpired: q.expiresAt ? new Date(q.expiresAt) < new Date() : false
                    })),
                    orderContext: conversationOrders.map(o => ({
                        orderId: o.id,
                        status: o.status,
                        total: Number(o.totalAmount || o.price || 0),
                        quoteId: o.quoteId,
                        createdAt: o.createdAt,
                        lastStatusUpdateAt: o.updatedAt
                    })),
                    frankSession: frankSession ?? null,
                    customerCrmContext: {
                        customerId: resolvedCustomerId,
                        name: contact?.name ?? organizationRecord?.tradeName ?? organizationRecord?.legalName ?? 'Lead WhatsApp',
                        phone: plaintextPhone,
                        segment: dbCustomer?.segment,
                        cidade: undefined, // future
                        uf: undefined, // future
                        source: 'N/A', // fallback
                        ownerId: dbCustomer?.ownerId ?? conversation.assignedTo,
                        stage: conversation.stage,
                        createdAt: dbCustomer?.createdAt || conversation.createdAt,
                        lastInteractionAt: conversation.lastMessageAt || conversation.createdAt,
                        totalQuotes,
                        totalOrders,
                        totalRevenue,
                        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                    },
                    customerCommercialContext: {
                        totalQuotes,
                        totalOrders,
                        totalRevenue,
                        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                        lastOrderAt,
                        lastQuotedAt,
                        purchasedProducts,
                    },
                    recentNotes: recentNotes.map(n => ({
                        id: n.id,
                        content: n.content,
                        authorOperatorId: n.authorOperatorId,
                        createdAt: n.createdAt
                    })),
                    openTasks: upcomingTasks.filter(t => !t.dueAt || new Date(t.dueAt) >= new Date()).map(t => ({
                        id: t.id,
                        title: t.title,
                        assignedOperatorId: t.assignedOperatorId,
                        dueAt: t.dueAt,
                        status: t.status
                    })),
                    overdueTasks: upcomingTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date()).map(t => ({
                        id: t.id,
                        title: t.title,
                        assignedOperatorId: t.assignedOperatorId,
                        dueAt: t.dueAt,
                        status: t.status
                    })),
                    contextBlock: {
                        customerId: resolvedCustomerId,
                        name: contact?.name ?? organizationRecord?.tradeName ?? organizationRecord?.legalName ?? 'Lead WhatsApp',
                        phone: plaintextPhone,
                        cidade: '<N/A>', // Not tracked initially
                        uf: '<N/A>', // Not tracked initially
                        segment: dbCustomer?.segment ?? 'Lead',
                        totalOrders,
                        totalQuotes,
                        lastInteractionAt: conversation.lastMessageAt || conversation.createdAt
                    }
                },
                customer,
                contact: contact ?? null,
                organization: organization ?? null,
                messages,
                lastQuote: lastQuote ?? null,
                lastOrder: lastOrder ?? null,
                shipment: shipment ?? null,
                frankSession: frankSession ?? null,
            },
        });
    } catch (err: any) {
        logger.error('Failed to get conversation details', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
