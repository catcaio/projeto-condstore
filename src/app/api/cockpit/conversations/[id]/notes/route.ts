import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { crmNotes } from '@/drizzle/schema';
import { and, eq, desc } from 'drizzle-orm';
import { conversationRepository } from '@/modules/atendimento/conversation.repository';
import crypto from 'crypto';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const conversation = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!conversation || !conversation.customerId) {
            return NextResponse.json({ ok: true, data: [] });
        }

        const db = await getDb();
        const notes = await db.select().from(crmNotes)
            .where(and(eq(crmNotes.tenantId, tenantId), eq(crmNotes.customerId, conversation.customerId)))
            .orderBy(desc(crmNotes.createdAt));

        return NextResponse.json({ ok: true, data: notes });
    } catch (err: any) {
        logger.error('Failed to get crm notes', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, user } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const { content } = body;

        if (!content || typeof content !== 'string') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Missing or invalid content');
        }

        const conversation = await conversationRepository.getConversationById(tenantId, conversationId);
        if (!conversation || !conversation.customerId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Conversation must have a linked customer to add notes');
        }

        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(crmNotes).values({
            id,
            tenantId,
            customerId: conversation.customerId,
            conversationId,
            authorOperatorId: user?.id || 'system',
            content
        });

        const [newNote] = await db.select().from(crmNotes).where(eq(crmNotes.id, id));

        return NextResponse.json({ ok: true, data: newNote });
    } catch (err: any) {
        logger.error('Failed to create crm note', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
