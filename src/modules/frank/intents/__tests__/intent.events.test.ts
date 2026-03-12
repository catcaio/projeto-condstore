import { describe, it, expect, vi } from 'vitest';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { 
    emitIntentCaptured, 
    emitIntentValidated, 
    emitIntentIgnored 
} from '../intent.events';

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined)
}));

describe('Intent Events Typing', () => {
    it('should emit intent_captured tightly coupled with operational bus', () => {
        emitIntentCaptured('t1', {
            intentId: 'i1',
            sessionId: 's1',
            conversationId: 'c1',
            messageId: 'm1',
            detectedIntent: 'BUY',
            confidence: 0.95
        });

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            eventType: 'intent_captured',
            entityId: 'i1',
            sessionId: 's1'
        }));
    });

    it('should emit intent_validated tightly coupled with operational bus', () => {
        emitIntentValidated('t1', {
            intentId: 'i1',
            validatedBy: 'user1'
        });

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            eventType: 'intent_validated',
            entityId: 'i1',
            sessionId: undefined
        }));
    });
});
