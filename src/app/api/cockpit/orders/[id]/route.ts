import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { getOrderAggregate } from '@/modules/pedidos/order.repository';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id } = await context.params;
        
        const orderData = await getOrderAggregate(tenantId, id);

        if (!orderData) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Order not found');
        }

        return NextResponse.json({ ok: true, data: orderData });
    } catch (err: any) {
        logger.error('Failed to get order details', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

