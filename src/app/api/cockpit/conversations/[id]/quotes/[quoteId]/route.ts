import { NextRequest, NextResponse } from 'next/server';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string, quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId } = auth.session as any; 

    try {
        const { id: conversationId, quoteId } = await context.params;
        const body = await request.json().catch(() => ({}));
        
        const quote = await freightQuoteService.getQuoteById(tenantId, quoteId);
        if (!quote) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Quote not found');
        }

        if (quote.conversationId !== conversationId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Quote does not belong to this conversation');
        }

        const updatedQuote = await freightQuoteService.reviseQuote(tenantId, quoteId, {
            items: body.items,
            discountAmount: body.discountAmount !== undefined ? Number(body.discountAmount) : undefined,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        });

        return NextResponse.json({ ok: true, data: updatedQuote });
    } catch (err: any) {
        logger.error('Failed to revise freight quote', err as Error, { requestId });
        return errorResponse(
            (err.message.includes('Discount') || err.message.includes('Cannot revise')) ? 'VALIDATION_ERROR' as any : 'INTERNAL_ERROR' as any,
            (err.message.includes('Discount') || err.message.includes('Cannot revise')) ? 400 : 500,
            requestId,
            err.message
        );
    }
}
