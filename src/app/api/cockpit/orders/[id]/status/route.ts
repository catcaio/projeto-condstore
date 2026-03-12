import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
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
        const body = await request.json().catch(() => ({}));
        const { status } = body;

        if (!status || !['CREATED', 'CONFIRMED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(status)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Invalid order status');
        }

        await orderService.updateOrderStatus(tenantId, orderId, status as any);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to update order status', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
