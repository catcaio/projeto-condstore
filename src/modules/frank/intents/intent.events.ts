import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface IntentCapturedEventPayload {
    intentId: string;
    sessionId: string;
    conversationId?: string | null;
    messageId?: string | null;
    detectedIntent?: string | null;
    confidence?: number | null;
}

export interface IntentValidatedEventPayload {
    intentId: string;
    validatedBy: string;
}

export interface IntentIgnoredEventPayload {
    intentId: string;
    ignoredBy: string;
}

export function emitIntentCaptured(tenantId: string, payload: IntentCapturedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_captured',
        entityId: payload.intentId,
        customerId: null,
        sessionId: payload.sessionId,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}

export function emitIntentValidated(tenantId: string, payload: IntentValidatedEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_validated',
        entityId: payload.intentId,
        customerId: null,
        sessionId: undefined,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}

export function emitIntentIgnored(tenantId: string, payload: IntentIgnoredEventPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_ignored',
        entityId: payload.intentId,
        customerId: null,
        sessionId: undefined,
        payload: payload as unknown as Record<string, unknown>
    }).catch(() => {});
}
