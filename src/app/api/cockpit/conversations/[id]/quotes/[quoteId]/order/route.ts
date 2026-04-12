import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { orderService } from '@/modules/atendimento/order.service';
import { isOrderBillingRequiredError } from '@/modules/billing/guards/assertTenantCanOperateOrders';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string; quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, sub } = auth.session as any;
    const { id: conversationId, quoteId } = await context.params;

    try {
        const newOrder = await orderService.createOrderFromQuote(
            tenantId,
            conversationId,
            quoteId,
            sub
        );

        return NextResponse.json({ ok: true, data: newOrder });
    } catch (err: any) {
        if (isOrderBillingRequiredError(err)) {
            logger.warn('Order creation blocked by billing gate', {
                requestId,
                tenantId,
                conversationId,
                quoteId,
                planStatus: err.planStatus,
            });
            return errorResponse(ErrorCode.VALIDATION_ERROR, err.statusCode, requestId, err.message);
        }

        logger.error('Failed to create order from quote', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
