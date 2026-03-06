/**
 * event-domains.ts
 * Canonical set of operational event domains and standard event types.
 */

// ── Domains ───────────────────────────────────────────────────────────────────

export const EVENT_DOMAINS = ['ACQUISITION', 'CONVERSION', 'OPERATIONS', 'REVENUE', 'RETENTION'] as const;

export type EventDomain = (typeof EVENT_DOMAINS)[number];

export function isValidEventDomain(value: string): value is EventDomain {
    return (EVENT_DOMAINS as readonly string[]).includes(value);
}

// ── Standard Event Types ──────────────────────────────────────────────────────

export const ACQUISITION_EVENTS = {
    LEAD_CREATED: 'lead_created',
    TRAFFIC_ATTRIBUTED: 'traffic_attributed',
} as const;

export const CONVERSION_EVENTS = {
    QUOTE_CREATED: 'quote_created',
    ORDER_CREATED: 'order_created',
    CHECKOUT_STARTED: 'checkout_started',
    CHECKOUT_COMPLETED: 'checkout_completed',
} as const;

export const OPERATIONS_EVENTS = {
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_REPLIED: 'message_replied',
    DELIVERY_CREATED: 'delivery_created',
    DELIVERY_COMPLETED: 'delivery_completed',
} as const;

export const REVENUE_EVENTS = {
    PAYMENT_CONFIRMED: 'payment_confirmed',
    MARGIN_ESTIMATED: 'margin_estimated',
} as const;

export const RETENTION_EVENTS = {
    REPEAT_ORDER: 'repeat_order',
    CUSTOMER_REACTIVATED: 'customer_reactivated',
} as const;

export const ALL_STANDARD_EVENT_TYPES = {
    ...ACQUISITION_EVENTS,
    ...CONVERSION_EVENTS,
    ...OPERATIONS_EVENTS,
    ...REVENUE_EVENTS,
    ...RETENTION_EVENTS,
} as const;

export type StandardEventType = (typeof ALL_STANDARD_EVENT_TYPES)[keyof typeof ALL_STANDARD_EVENT_TYPES];

/** Map from event type → its domain (for validation helpers). */
export const EVENT_TYPE_TO_DOMAIN: Record<string, EventDomain> = {
    // ACQUISITION
    lead_created: 'ACQUISITION',
    traffic_attributed: 'ACQUISITION',
    // CONVERSION
    quote_created: 'CONVERSION',
    order_created: 'CONVERSION',
    checkout_started: 'CONVERSION',
    checkout_completed: 'CONVERSION',
    // OPERATIONS
    message_received: 'OPERATIONS',
    message_replied: 'OPERATIONS',
    delivery_created: 'OPERATIONS',
    delivery_completed: 'OPERATIONS',
    // REVENUE
    payment_confirmed: 'REVENUE',
    margin_estimated: 'REVENUE',
    // RETENTION
    repeat_order: 'RETENTION',
    customer_reactivated: 'RETENTION',
};
