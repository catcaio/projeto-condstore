import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { classifyOrderFlowMessage, ORDER_FLOW_MESSAGES, ORDER_STATUS_INPUTS } from '@/modules/atendimento/order-flow.contract';
import { orderService } from '@/modules/atendimento/order.service';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, ORDER_FLOW_MESSAGES.invalidJsonBody);
        }

        const { status } = body;

        if (!status || !ORDER_STATUS_INPUTS.includes(status)) {
            return errorResponse(
                ErrorCode.VALIDATION_ERROR,
                400,
                requestId,
                `Invalid order status. Must be one of: ${ORDER_STATUS_INPUTS.join(', ')}`
            );
        }

        await orderService.updateOrderStatus(tenantId, orderId, status as any);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to update order status', err as Error, { requestId });
        const message = err?.message ?? 'Failed to update order status';
        const contractError = classifyOrderFlowMessage(message);

        if (contractError) {
            return errorResponse(contractError.code, contractError.status, requestId, message);
        }

        return errorResponse(ErrorCode.INTERNAL_ERROR, 500, requestId, message);
    }
}
