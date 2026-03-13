import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';
import { getDb } from '@/infra/db';
import {
    customerContacts,
    freightSimulations,
    frankSessionState,
    orders,
    organizations,
    shipments,
} from '@/drizzle/schema';

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

        const [frankSession] = conversation.phoneHash
            ? await db
                .select()
                .from(frankSessionState)
                .where(and(eq(frankSessionState.tenantId, tenantId), eq(frankSessionState.sessionId, conversation.phoneHash)))
                .limit(1)
            : [];

        const [contact] = conversation.phoneHash
            ? await db
                .select()
                .from(customerContacts)
                .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.phoneHash, conversation.phoneHash)))
                .limit(1)
            : conversation.customerId
                ? await db
                    .select()
                    .from(customerContacts)
                    .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.customerId, conversation.customerId)))
                    .limit(1)
                : [];

        const resolvedCustomerId = conversation.customerId ?? contact?.customerId ?? frankSession?.customerId ?? null;
        const resolvedOrganizationId = conversation.organizationId ?? contact?.organizationId ?? frankSession?.organizationId ?? null;

        const [organizationRecord] = resolvedOrganizationId
            ? await db
                .select()
                .from(organizations)
                .where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, resolvedOrganizationId)))
                .limit(1)
            : [];

        const [lastOrder] = frankSession?.lastOrderId
            ? await db
                .select()
                .from(orders)
                .where(and(eq(orders.tenantId, tenantId), eq(orders.id, frankSession.lastOrderId)))
                .limit(1)
            : resolvedCustomerId
                ? await db
                    .select()
                    .from(orders)
                    .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, resolvedCustomerId)))
                    .orderBy(desc(orders.createdAt))
                    .limit(1)
                : await db
                    .select()
                    .from(orders)
                    .where(and(eq(orders.tenantId, tenantId), eq(orders.conversationId, conversationId)))
                    .orderBy(desc(orders.createdAt))
                    .limit(1);

        const [lastQuote] = frankSession?.lastReferencedQuoteId
            ? await db
                .select()
                .from(freightSimulations)
                .where(and(eq(freightSimulations.tenantId, tenantId), eq(freightSimulations.id, frankSession.lastReferencedQuoteId)))
                .limit(1)
            : lastOrder?.freightSimulationId
                ? await db
                    .select()
                    .from(freightSimulations)
                    .where(and(eq(freightSimulations.tenantId, tenantId), eq(freightSimulations.id, lastOrder.freightSimulationId)))
                    .limit(1)
                : await db
                    .select()
                    .from(freightSimulations)
                    .where(eq(freightSimulations.tenantId, tenantId))
                    .orderBy(desc(freightSimulations.createdAt))
                    .limit(1);

        const [shipment] = frankSession?.lastReferencedShipmentId
            ? await db
                .select()
                .from(shipments)
                .where(and(eq(shipments.tenantId, tenantId), eq(shipments.id, frankSession.lastReferencedShipmentId)))
                .limit(1)
            : lastOrder
                ? await db
                    .select()
                    .from(shipments)
                    .where(and(eq(shipments.tenantId, tenantId), eq(shipments.orderId, lastOrder.id)))
                    .orderBy(desc(shipments.updatedAt))
                    .limit(1)
                : [];

        const organization = presentOrganization(organizationRecord ?? null);
        const customer = presentCustomer({
            customerId: resolvedCustomerId,
            contact: contact ?? null,
            organization: organizationRecord ?? null,
        });

        const plaintextPhone = decryptString(conversation.phoneEncrypted);
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
                    frankSession: frankSession ?? null,
                },
                customer,
                contact: contact || null,
                organization: organization || null,
                messages,
                lastQuote: lastQuote || null,
                lastOrder: lastOrder || null,
                shipment: shipment || null,
                frankSession: frankSession || null,
            },
        });
    } catch (err: any) {
        logger.error('Failed to get conversation details', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
