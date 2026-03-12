export type TimelineEntity = 'conversation' | 'customer' | 'order' | 'shipment' | 'system';

export interface TimelineEvent {
    id: string;
    tenantId: string;
    entity: TimelineEntity;
    entityId: string;
    eventType: string;
    title: string;
    description: string;
    createdAt: Date;
    actor?: string;
    metadata?: Record<string, any>;
}

export interface GetTimelineQuery {
    tenantId: string;
    entity?: TimelineEntity;
    entityId?: string;
    limit?: number;
    cursor?: Date; // We'll paginate backwards by createdAt date
}

export interface TimelineResponse {
    events: TimelineEvent[];
    nextCursor?: Date;
}
