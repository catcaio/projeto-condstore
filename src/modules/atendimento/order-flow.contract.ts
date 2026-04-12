import { ErrorCode } from '@/infra/http/error-response';

export const ORDER_STATUS_INPUTS = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'] as const;

export const ORDER_FLOW_MESSAGES = {
    invalidJsonBody: 'Invalid JSON body',
    orderNotFound: 'Order not found',
    quoteLockBusy: 'A cotação está sendo processada no momento. Por favor aguarde um instante.',
    quoteConversationMismatch: 'Quote does not belong to this conversation',
    quoteExpired: 'Quote has expired and can no longer be converted',
    quoteNotFound: 'Quote not found',
} as const;

export function quoteConversionStatusConflictMessage(status: string) {
    return `Cannot convert quote with status: ${status}`;
}

export function quoteMustBeAcceptedMessage(status: string) {
    return `Quote must be ACCEPTED before creating an order. Current status: ${status}`;
}

export function orderStatusRegressionMessage(currentStatus: string, nextStatus: string) {
    return `Cannot regress order status from ${currentStatus} to ${nextStatus}`;
}

export function terminalOrderStatusChangeMessage(status: string) {
    return `Cannot change status of a ${status} order`;
}

export function classifyOrderFlowMessage(message: string) {
    if (message === ORDER_FLOW_MESSAGES.quoteNotFound || message === ORDER_FLOW_MESSAGES.orderNotFound) {
        return { code: ErrorCode.NOT_FOUND, status: 404 };
    }

    if (message === ORDER_FLOW_MESSAGES.quoteConversationMismatch) {
        return { code: ErrorCode.VALIDATION_ERROR, status: 400 };
    }

    if (message === ORDER_FLOW_MESSAGES.quoteLockBusy) {
        return { code: ErrorCode.LOCK_BUSY, status: 409 };
    }

    if (
        message === ORDER_FLOW_MESSAGES.quoteExpired ||
        message.startsWith('Cannot convert quote with status:') ||
        message.startsWith('Quote must be ACCEPTED before creating an order.') ||
        message.startsWith('Cannot regress order status from') ||
        message.startsWith('Cannot change status of a ')
    ) {
        return { code: ErrorCode.CONFLICT, status: 409 };
    }

    return null;
}
