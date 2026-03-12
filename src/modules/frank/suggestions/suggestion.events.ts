import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export function emitSuggestionGenerated(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_generated',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}

export function emitSuggestionApproved(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_approved',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}

export function emitSuggestionEdited(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_edited',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}

export function emitSuggestionRejected(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_rejected',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}
