import { describe, it, expect, vi } from 'vitest';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { 
    emitSuggestionGenerated, 
    emitSuggestionApproved, 
    emitSuggestionEdited 
} from '../suggestion.events';

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined)
}));

describe('Suggestion Events Typing', () => {
    it('should emit suggestion generated', () => {
        emitSuggestionGenerated('t1', {
            suggestionId: 's1',
            sessionId: 'ses1',
            intent: 'greeting',
            confidence: 0.99
        });

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            eventType: 'frank_suggestion_generated',
            entityId: 's1',
            sessionId: 'ses1'
        }));
    });

    it('should emit suggestion approved', () => {
        emitSuggestionApproved('t1', {
            suggestionId: 's1',
            sessionId: 'ses1',
            approvedBy: 'operator1',
            edited: false
        });

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            eventType: 'frank_suggestion_approved',
            entityId: 's1',
            sessionId: 'ses1'
        }));
    });
});
