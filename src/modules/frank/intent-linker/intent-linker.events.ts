import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export function emitIntentLinkedToPlaybook(tenantId: string, payload: {
    intentId: string;
    playbookId: string;
    detectedIntent: string | null;
    linkedBy: string;
}) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_linked_to_playbook',
        entityId: payload.intentId,
        customerId: null,
        sessionId: null,
        payload
    }).catch(() => {});
}

export function emitIntentConvertedToPlaybook(tenantId: string, payload: {
    intentId: string;
    playbookId: string;
    detectedIntent: string | null;
    convertedBy: string;
}) {
    publishOperationalEvent({
        tenantId,
        eventDomain: 'OPERATIONS',
        eventType: 'intent_converted_to_playbook',
        entityId: payload.intentId,
        customerId: null,
        sessionId: null,
        payload
    }).catch(() => {});
}
