import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { orderService } from '@/modules/atendimento/order.service';
import { isOrderBillingRequiredError } from '@/modules/billing/guards/assertTenantCanOperateOrders';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;
    const { id: orderId } = await context.params;

    try {
        const body = await request.json().catch(() => ({}));
        const { status } = body;

        const validStatuses = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'];
        if (!status || !validStatuses.includes(status)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, `Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
        }

        await orderService.updateOrderStatus(tenantId, orderId, status as any);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        if (isOrderBillingRequiredError(err)) {
            logger.warn('Order confirmation blocked by billing gate', {
                requestId,
                tenantId,
                orderId,
                planStatus: err.planStatus,
            });
            return errorResponse(ErrorCode.VALIDATION_ERROR, err.statusCode, requestId, err.message);
        }

        logger.error('Failed to update order status', err as Error, { requestId });
        const msg = err.message;
        const isValidation = msg.includes('Cannot regress') || msg.includes('Cannot change status of') || msg.includes('Order not found');
        return errorResponse(
            isValidation ? 'VALIDATION_ERROR' as any : 'INTERNAL_ERROR' as any,
            isValidation ? 400 : 500,
            requestId,
            msg
        );
    }
}
