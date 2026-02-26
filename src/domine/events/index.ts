export interface EventEnvelope<T> {
    eventId: string;
    eventType: string;
    tenantId: string;
    source: string;
    occurredAt: string;
    idempotencyKey: string;
    payload: T;
}

export type KnownEventTypes =
    | "order.created"
    | "order.paid"
    | "inventory.reserved"
    | "shipment.label_created"
    | "invoice.issued"
    | "connector.sync_started"
    | "connector.sync_failed";

export function createEvent<T>(
    eventType: KnownEventTypes,
    tenantId: string,
    source: string,
    idempotencyKey: string,
    payload: T
): EventEnvelope<T> {
    // Use a pseudo-random event id if crypto is not available globally, 
    // though crypto.randomUUID() is standard in modern environments
    const eventId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
        eventId,
        eventType,
        tenantId,
        source,
        occurredAt: new Date().toISOString(),
        idempotencyKey,
        payload,
    };
}
