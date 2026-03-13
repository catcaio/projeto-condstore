import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { conversations, organizations, customers, customerContacts } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { v4 as uuidv4 } from 'uuid';

export const revalidate = 0; // dynamic API

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Nome é obrigatório');
        }

        const db = await getDb();

        const [conversation] = await db.select().from(conversations)
            .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
            .limit(1);

        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        if (!conversation.phoneHash) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Conversa não possui telefone vinculado');
        }

        // Check if a contact already exists
        const [existingContact] = await db.select().from(customerContacts)
            .where(and(eq(customerContacts.tenantId, tenantId), eq(customerContacts.phoneHash, conversation.phoneHash)))
            .limit(1);

        if (existingContact) {
            // Already identified
            return NextResponse.json({ ok: false, message: 'Contato já existente.' }, { status: 400 });
        }

        const orgId = uuidv4();
        const customerId = uuidv4();
        const contactId = uuidv4();
        const now = new Date();
        const mockCnpjHash = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');

        await db.transaction(async (tx) => {
            // 1. Create Organization
            await tx.insert(organizations).values({
                id: orgId,
                tenantId,
                legalName: name.trim(),
                cnpjHash: mockCnpjHash,
                createdAt: now,
            });

            // 2. Create Canonical Customer
            await tx.insert(customers).values({
                id: customerId,
                tenantId,
                organizationId: orgId,
                createdAt: now,
            });

            // 3. Create Contact
            await tx.insert(customerContacts).values({
                id: contactId,
                tenantId,
                organizationId: orgId,
                customerId: customerId,
                name: name.trim(),
                phoneHash: conversation.phoneHash!,
                phoneEncrypted: conversation.phoneEncrypted,
                createdAt: now,
            });

            // 4. Update Conversation
            await tx.update(conversations)
                .set({ customerId })
                .where(eq(conversations.id, conversationId));
        });

        // Publish events outside transaction
        await publishOperationalEvent({
            tenantId,
            eventType: 'customer_contact_created',
            eventDomain: 'OPERATIONS',
            payload: {
                contactId,
                organizationId: orgId,
                customerId,
                source: 'cockpit_conversation'
            }
        });

        await publishOperationalEvent({
            tenantId,
            eventType: 'customer_linked_to_conversation',
            eventDomain: 'OPERATIONS',
            payload: {
                conversationId,
                contactId,
                organizationId: orgId,
                customerId,
            }
        });

        return NextResponse.json({ ok: true });

    } catch (err: any) {
        logger.error('Failed to create customer from conversation', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
