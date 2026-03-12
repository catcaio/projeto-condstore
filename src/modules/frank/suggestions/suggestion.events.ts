import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface SuggestionGeneratedEventPayload {
    suggestionId: string;
    sessionId: string;
    conversationId?: string | null;
    intent?: string | null;
    confidence?: number | null;
}

export interface SuggestionApprovedEventPayload {
    suggestionId: string;
    sessionId: string;
    approvedBy: string;
    edited: boolean;
}

export interface SuggestionEditedEventPayload {
    suggestionId: string;
    sessionId: string;
    approvedBy: string;
    edited: boolean;
}

export interface SuggestionRejectedEventPayload {
    suggestionId: string;
    sessionId: string;
    rejectedBy: string;
}

export function emitSuggestionGenerated(tenantId: string, payload: SuggestionGeneratedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_generated',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}

export function emitSuggestionApproved(tenantId: string, payload: SuggestionApprovedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_approved',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}

export function emitSuggestionEdited(tenantId: string, payload: SuggestionEditedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_edited',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}

export function emitSuggestionRejected(tenantId: string, payload: SuggestionRejectedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'frank_suggestion_rejected',
        entityId: payload.suggestionId,
        customerId: null,
        sessionId: payload.sessionId,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}
