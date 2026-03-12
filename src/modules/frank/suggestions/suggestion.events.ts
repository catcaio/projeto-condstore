import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface SuggestionGeneratedPayload extends Record<string, unknown> {
    suggestionId: string;
    sessionId: string;
    conversationId: string;
    intent: string;
    confidence: number;
}

export interface SuggestionApprovedPayload extends Record<string, unknown> {
    suggestionId: string;
    sessionId: string | null;
    approvedBy: string;
    edited: boolean;
}

export interface SuggestionRejectedPayload extends Record<string, unknown> {
    suggestionId: string;
    sessionId: string | null;
    rejectedBy: string;
}

export function emitSuggestionGenerated(tenantId: string, payload: SuggestionGeneratedPayload) {
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

export function emitSuggestionApproved(tenantId: string, payload: SuggestionApprovedPayload) {
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

export function emitSuggestionEdited(tenantId: string, payload: SuggestionApprovedPayload) {
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

export function emitSuggestionRejected(tenantId: string, payload: SuggestionRejectedPayload) {
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
