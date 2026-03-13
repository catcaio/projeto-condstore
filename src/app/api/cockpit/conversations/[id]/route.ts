import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';
import { getDb } from '@/infra/db';
import { customers, customerContacts, organizations, orders, frankSessionState } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
export const revalidate = 0; // dynamic API

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        let customer = null;
        let contact = null;
        let organization = null;
        let recentOrders: any[] = [];

        const db = await getDb();

        if (conversation.customerId) {
            const [cust] = await db.select().from(customers)
                .where(and(eq(customers.tenantId, tenantId), eq(customers.id, conversation.customerId)))
                .limit(1);
            if (cust) {
                customer = cust;
            }
        }

        const [contactRecord] = await db.select().from(customerContacts)
            .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.phoneHash, conversation.phoneHash)))
            .limit(1);

        if (contactRecord) {
            contact = contactRecord;
            if (contactRecord.organizationId) {
                const [orgRecord] = await db.select().from(organizations)
                    .where(and(eq(organizations.tenantId, tenantId), eq(organizations.id, contactRecord.organizationId)))
                    .limit(1);
                organization = orgRecord || null;
            }
        }

        if (customer) {
            recentOrders = await db.select().from(orders)
                .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, customer.id)))
                .orderBy(desc(orders.createdAt))
                .limit(3);
        }

        let frankSession = null;
        if (conversation.phoneHash) {
            const [sessionRec] = await db.select().from(frankSessionState)
                .where(and(eq(frankSessionState.tenantId, tenantId), eq(frankSessionState.sessionId, conversation.phoneHash)))
                .limit(1);
            if (sessionRec) {
                frankSession = sessionRec;
            }
        }

        // Securely decrypt the phone for Cockpit UI, but in a sanitized payload
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
                    recentOrders,
                    frankSession
                },
                messages
            }
        });
    } catch (err: any) {
        logger.error('Failed to get conversation details', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
