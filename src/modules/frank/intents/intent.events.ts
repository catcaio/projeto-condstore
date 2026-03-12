import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export function emitIntentCaptured(tenantId: string, payload: any) {
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

export function emitIntentValidated(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_validated',
        entityId: payload.intentId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}

export function emitIntentIgnored(tenantId: string, payload: any) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_ignored',
        entityId: payload.intentId,
        customerId: null,
        sessionId: payload.sessionId,
        payload
    }).catch(() => {});
}
