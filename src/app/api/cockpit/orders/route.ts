import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { orderService } from '@/modules/atendimento/order.service';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { searchParams } = new URL(request.url);
        const limitParam = Number(searchParams.get('limit')) || 200;
        const limit = Math.min(limitParam, 500);
        const conversationId = searchParams.get('conversationId') || undefined;
        
        const orders = await orderService.listOrders(tenantId, { limit, conversationId });
        logger.info(`Listed orders for tenant`, { tenantId, count: orders.length, requestId });
        return NextResponse.json({ ok: true, data: orders });
    } catch (err: any) {
        logger.error('Failed to list orders', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
