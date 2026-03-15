import { NextRequest, NextResponse } from 'next/server';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

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
        const quotes = await freightQuoteService.listConversationQuotes(tenantId, conversationId);
        return NextResponse.json({ ok: true, data: quotes });
    } catch (err: any) {
        logger.error('Failed to list conversation quotes', err as Error, { requestId });
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
    
    const { tenantId, userId: operatorId } = auth.session as any;

    try {
        const { id: conversationId } = await context.params;
        const body = await request.json().catch(() => ({}));

        const { cep, weight, quantity, dimensions, items } = body;

        if (!cep || !weight || !quantity) {
             return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'cep, weight, and quantity are required');
        }

        const conversation = await conversationService.getConversationById(tenantId, conversationId);
        if (!conversation) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const result = await freightQuoteService.simulateQuoteFromConversation({
            tenantId,
            conversationId,
            customerId: conversation.customerId || undefined,
            operatorId,
            cep,
            weight: Number(weight),
            quantity: Number(quantity),
            dimensions,
            items
        });

        return NextResponse.json({ ok: true, data: result });
    } catch (err: any) {
        logger.error('Failed to simulate freight quote', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
