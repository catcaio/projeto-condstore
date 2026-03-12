import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface IntentCapturedPayload extends Record<string, unknown> {
    intentId: string;
    sessionId: string;
    conversationId?: string | null;
    messageId?: string | null;
    detectedIntent?: string | null;
    confidence?: number | null;
}

export interface IntentValidatedPayload extends Record<string, unknown> {
    intentId: string;
    validatedBy: string;
}

export interface IntentIgnoredPayload extends Record<string, unknown> {
    intentId: string;
    ignoredBy: string;
}

export function emitIntentCaptured(tenantId: string, payload: IntentCapturedPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_captured',
        entityId: payload.intentId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}

export function emitIntentValidated(tenantId: string, payload: IntentValidatedPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_validated',
        entityId: payload.intentId,
        customerId: null,
        sessionId: null,
        payload
    }).catch(() => {});
}

export function emitIntentIgnored(tenantId: string, payload: IntentIgnoredPayload) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_ignored',
        entityId: payload.intentId,
        customerId: null,
        sessionId: null,
        payload
    }).catch(() => {});
}
