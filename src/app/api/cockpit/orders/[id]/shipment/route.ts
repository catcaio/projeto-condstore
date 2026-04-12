import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { shipmentService } from '@/modules/logistics/server';
import { classifyShipmentFlowMessage, SHIPMENT_FLOW_MESSAGES, SHIPMENT_STATUS_INPUTS } from '@/modules/logistics/shipment.contract';

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
        return errorResponse(ErrorCode.INTERNAL_ERROR, 500, requestId, err.message);
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
        let body;
        try {
            body = await request.json();
        } catch {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, SHIPMENT_FLOW_MESSAGES.invalidJsonBody);
        }
        const { status, trackingCode, trackingUrl, shipmentId } = body;
        const shipment = await shipmentService.getShipmentByOrder(tenantId, orderId);
        if (!shipment) {
            return errorResponse(ErrorCode.NOT_FOUND, 404, requestId, SHIPMENT_FLOW_MESSAGES.shipmentNotFoundForOrder);
        }

        if (shipmentId && shipment.id !== shipmentId) {
            return errorResponse(ErrorCode.NOT_FOUND, 404, requestId, SHIPMENT_FLOW_MESSAGES.shipmentNotFoundForOrder);
        }

        if (status && !SHIPMENT_STATUS_INPUTS.includes(status)) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid shipment status');
        }

        await shipmentService.updateShipmentStatus(tenantId, shipment.id, status || 'CREATED', trackingCode, trackingUrl);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        logger.error('Failed to update shipment', err as Error, { requestId });
        const message = err?.message ?? 'Failed to update shipment';
        const contractError = classifyShipmentFlowMessage(message);

        if (contractError) {
            return errorResponse(contractError.code, contractError.status, requestId, message);
        }

        return errorResponse(ErrorCode.INTERNAL_ERROR, 500, requestId, message);
    }
}
