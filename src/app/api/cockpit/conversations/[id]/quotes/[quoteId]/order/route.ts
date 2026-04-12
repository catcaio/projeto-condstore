import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { classifyOrderFlowMessage } from '@/modules/atendimento/order-flow.contract';
import { orderService } from '@/modules/atendimento/order.service';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string; quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, sub } = auth.session as any;

    try {
        const { id: conversationId, quoteId } = await context.params;

        const newOrder = await orderService.createOrderFromQuote(
            tenantId,
            conversationId,
            quoteId,
            sub
        );

        return NextResponse.json({ ok: true, data: newOrder });
    } catch (err: any) {
        logger.error('Failed to create order from quote', err as Error, { requestId });
        const message = err?.message ?? 'Failed to create order from quote';
        const contractError = classifyOrderFlowMessage(message);

        if (contractError) {
            return errorResponse(contractError.code, contractError.status, requestId, message);
        }

        return errorResponse(ErrorCode.INTERNAL_ERROR, 500, requestId, message);
    }
}
