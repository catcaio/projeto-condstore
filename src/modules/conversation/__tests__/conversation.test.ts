
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationService, conversationService } from '../conversation.service';
import { FreightFlow, freightFlow } from '../freight-flow';

const mocks = vi.hoisted(() => ({
    findFirst: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    processMessage: vi.fn().mockResolvedValue({ reply: 'Contagem de frete simulada' })
}));

vi.mock('../../../infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        query: { conversationState: { findFirst: mocks.findFirst } },
        insert: mocks.insert,
        delete: mocks.delete
    })
}));

vi.mock('../../../legacy/freight.controller', () => ({
    freightControllerLegacy: {
        processMessage: mocks.processMessage
    }
}));

describe('Conversation Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('ConversationService', () => {
        it('should return null if no state found', async () => {
            mocks.findFirst.mockResolvedValue(null);
            const state = await conversationService.getState('t1', '123');
            expect(state).toBeNull();
        });

        it('should verify TTL (mocked at query level)', async () => {
            const now = new Date();
            mocks.findFirst.mockResolvedValue({
                currentStep: 'AWAITING_CEP',
                expiresAt: new Date(now.getTime() + 10000)
            });
            const state = await conversationService.getState('t1', '123');
            expect(state?.currentStep).toBe('AWAITING_CEP');
        });
    });

    describe('FreightFlow', () => {
        it('should handle NONE state with CEP by quoting immediately', async () => {
            const spyUpdate = vi.spyOn(conversationService, 'updateState').mockResolvedValue();

            const result = await freightFlow.handle('t1', '123', 'frete para 12345-678', 'NONE', {});

            expect(result.nextStep).toBe('COMPLETED');
            // Expect context to contain sessionId and cep (extracted as formatted)
            expect(spyUpdate).toHaveBeenCalledWith('t1', '123', 'COMPLETED', expect.objectContaining({
                cep: '12345-678',
                sessionId: expect.any(String)
            }));
        });

        it('should handle NONE state without CEP by asking for it', async () => {
            const spyUpdate = vi.spyOn(conversationService, 'updateState').mockResolvedValue();

            const result = await freightFlow.handle('t1', '123', 'quero frete', 'NONE', {});

            expect(result.nextStep).toBe('AWAITING_CEP');
            expect(result.reply).toContain('informe seu CEP');
            expect(spyUpdate).toHaveBeenCalledWith('t1', '123', 'AWAITING_CEP', expect.objectContaining({
                sessionId: expect.any(String)
            }));
        });

        it('should handle AWAITING_CEP with valid CEP', async () => {
            const spyUpdate = vi.spyOn(conversationService, 'updateState').mockResolvedValue();

            const result = await freightFlow.handle('t1', '123', '12345-678', 'AWAITING_CEP', { sessionId: 'sess1' });

            expect(result.nextStep).toBe('COMPLETED');
            expect(result.reply).toContain('Contagem de frete simulada'); // From mock
            expect(spyUpdate).toHaveBeenCalledWith('t1', '123', 'COMPLETED', expect.objectContaining({
                sessionId: 'sess1'
            }));
        });

        it('should handle AWAITING_CEP with invalid CEP', async () => {
            const result = await freightFlow.handle('t1', '123', 'invalid', 'AWAITING_CEP', {});

            expect(result.nextStep).toBe('AWAITING_CEP');
            expect(result.reply).toContain('CEP inválido');
        });
    });
});
