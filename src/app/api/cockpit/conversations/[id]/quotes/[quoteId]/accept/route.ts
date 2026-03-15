import { NextRequest, NextResponse } from 'next/server';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string, quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId } = auth.session as any; 

    try {
        const { id: conversationId, quoteId } = await context.params;
        
        const quote = await freightQuoteService.getQuoteById(tenantId, quoteId);
        if (!quote) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Quote not found');
        }

        if (quote.conversationId !== conversationId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Quote does not belong to this conversation');
        }

        await freightQuoteService.acceptQuote(tenantId, quoteId);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to accept freight quote', err as Error, { requestId });
        return errorResponse(
            err.message.includes('Cannot manually accept') ? 'VALIDATION_ERROR' as any : 'INTERNAL_ERROR' as any,
            err.message.includes('Cannot manually accept') ? 400 : 500,
            requestId,
            err.message
        );
    }
}
