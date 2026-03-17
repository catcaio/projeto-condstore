import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { shipmentService } from '@/modules/logistics/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { id: orderId } = await context.params;
        const shipment = await shipmentService.getShipmentByOrder(tenantId, orderId);

        return NextResponse.json({ ok: true, data: shipment || null });
    } catch (err: any) {
        logger.error('Failed to get shipment', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

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
        // The shipmentId must be provided in the body or resolved via the orderId
        const body = await request.json().catch(() => ({}));
        const { status, trackingCode, trackingUrl, shipmentId } = body;

        let targetShipmentId = shipmentId;
        if (!targetShipmentId) {
            const shipment = await shipmentService.getShipmentByOrder(tenantId, orderId);
            if (!shipment) return errorResponse('NOT_FOUND' as any, 404, requestId, 'Shipment not found for this order');
            targetShipmentId = shipment.id;
        }

        if (status && !['CREATED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'].includes(status)) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Invalid shipment status');
        }

        await shipmentService.updateShipmentStatus(tenantId, targetShipmentId, status || 'CREATED', trackingCode, trackingUrl);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to update shipment', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
