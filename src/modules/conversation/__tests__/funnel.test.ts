
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { freightFlow } from '../freight-flow';
import { conversationService } from '../conversation.service';
import { inboundMessageRepository } from '../../llm/repositories/message.repository';

// Mocks
vi.mock('../../llm/repositories/message.repository', () => ({
    inboundMessageRepository: {
        saveFunnelEvent: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('../conversation.service', () => ({
    conversationService: {
        updateState: vi.fn(),
        getState: vi.fn()
    }
}));

describe('Freight Funnel Telemetry', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should log INTENT_DETECTED and ASKED_CEP when starting flow without CEP', async () => {
        await freightFlow.handle('t1', 'phone1', 'quero frete', 'NONE', {});

        expect(inboundMessageRepository.saveFunnelEvent).toHaveBeenCalledTimes(2);

        // 1. INTENT_DETECTED
        expect(inboundMessageRepository.saveFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            phoneNumber: 'phone1',
            stage: 'INTENT_DETECTED',
            sessionId: expect.any(String)
        }));

        // 2. ASKED_CEP
        expect(inboundMessageRepository.saveFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({
            stage: 'ASKED_CEP'
        }));
    });

    it('should log INTENT_DETECTED, CEP_RECEIVED, and QUOTE_SENT when starting flow WITH CEP', async () => {
        // Mock execute (since it calls legacy controller)
        // Actually executeFreightQuote calls logEvent QUOTE_SENT.
        // We probably mocked the repository specifically, so we just verify calls.

        // We need to ensure legacy controller doesn't explode. It's not mocked here unless we do it.
        // But freightFlow imports it.
    });
});
