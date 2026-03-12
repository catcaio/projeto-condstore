import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { orderService } from '@/modules/atendimento/order.service';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string; quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, user } = auth.session as any;

    try {
        const { id: conversationId, quoteId } = await context.params;

        const newOrder = await orderService.createOrderFromQuote(
            tenantId,
            conversationId,
            quoteId,
            user.id
        );

        return NextResponse.json({ ok: true, data: newOrder });
    } catch (err: any) {
        logger.error('Failed to create order from quote', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
