export const ORDER_STATUS = {
    QUOTE_IN_PROGRESS: 'QUOTE_IN_PROGRESS',
    WAITING_APPROVAL: 'WAITING_APPROVAL',
    CONFIRMED: 'CONFIRMED',
    PICKING: 'PICKING',
    READY_FOR_PICKUP: 'READY_FOR_PICKUP',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    EXCEPTION: 'EXCEPTION',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const FINANCE_STATUS = {
    INVOICE_OPEN: 'INVOICE_OPEN',
    INVOICE_OVERDUE: 'INVOICE_OVERDUE',
    INVOICE_PAID: 'INVOICE_PAID',
} as const;

export type FinanceStatus = typeof FINANCE_STATUS[keyof typeof FINANCE_STATUS];

export const SUPPORT_STATUS = {
    SUPPORT_OPEN: 'SUPPORT_OPEN',
    SUPPORT_PENDING: 'SUPPORT_PENDING',
    SUPPORT_RESOLVED: 'SUPPORT_RESOLVED',
} as const;

export type SupportStatus = typeof SUPPORT_STATUS[keyof typeof SUPPORT_STATUS];

// Utility type for any timeline event status
export type CustomerTimelineStatus = OrderStatus | FinanceStatus | SupportStatus;

// Ensure there are no duplicates across domains (if needed by validation layer)
export const ALL_STATUSES = [
    ...Object.values(ORDER_STATUS),
    ...Object.values(FINANCE_STATUS),
    ...Object.values(SUPPORT_STATUS)
] as const;
