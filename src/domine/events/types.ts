export const DOMINE_EVENT_TYPES = [
    'FREIGHT_QUOTE_REQUESTED',
    'FREIGHT_QUOTE_COMPLETED',
    'WEBHOOK_RECEIVED',
    'KNOWLEDGE_SYNC_REQUESTED',
    'FINOPS_EVENT',
    'CUSTOMER_ACTIVITY',
] as const;

export type DomineEventType = (typeof DOMINE_EVENT_TYPES)[number];

export interface DomineEvent<T = unknown> {
    id: string;
    tenantId: string | null; // null for system-wide events
    type: DomineEventType;
    source: string;
    payload: T;
    createdAt: Date;
    version: number;
}
