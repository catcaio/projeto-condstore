import { ErrorCode } from '@/infra/http/error-response';

export const SHIPMENT_STATUS_INPUTS = ['CREATED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'] as const;

export const SHIPMENT_FLOW_MESSAGES = {
    invalidJsonBody: 'Invalid JSON body',
    shipmentNotFound: 'Shipment not found',
    shipmentNotFoundForOrder: 'Shipment not found for this order',
} as const;

export function deliveredShipmentChangeMessage() {
    return 'Cannot change status of a DELIVERED shipment';
}

export function shipmentStatusRegressionMessage(currentStatus: string, nextStatus: string) {
    return `Cannot regress shipment status from ${currentStatus} to ${nextStatus}`;
}

export function classifyShipmentFlowMessage(message: string) {
    if (message === SHIPMENT_FLOW_MESSAGES.shipmentNotFound || message === SHIPMENT_FLOW_MESSAGES.shipmentNotFoundForOrder) {
        return { code: ErrorCode.NOT_FOUND, status: 404 };
    }

    if (
        message === deliveredShipmentChangeMessage() ||
        message.startsWith('Cannot regress shipment status from')
    ) {
        return { code: ErrorCode.CONFLICT, status: 409 };
    }

    return null;
}
