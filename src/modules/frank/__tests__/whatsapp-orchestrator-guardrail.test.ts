import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as appConfig from '@/config/app.config';

vi.mock('@/config/app.config', async () => {
    const actual = await vi.importActual('@/config/app.config') as any;
    return {
        ...actual,
        isFrankSupervisedOnly: vi.fn().mockReturnValue(true),
    };
});

// Since whatsapp-orchestrator is huge and has side effects, we isolate the specific function behavior
// Here we mock intent resolver, entity resolver, conversation control, and tool runner to test the orchestration flow
vi.mock('../intent-resolver', () => ({
    resolveContextualIntent: vi.fn().mockReturnValue({ intent: 'CONFIRM_QUOTE', confidence: 0.95 }),
    resolveIntent: vi.fn().mockReturnValue({ intent: 'CONFIRM_QUOTE', confidence: 0.95 }),
}));

vi.mock('../entity-resolver', () => ({
    resolveEntities: vi.fn().mockReturnValue({ 
        entities: { cep: null, productRef: null, product: null, orderId: null }, 
        missing: [] 
    }),
    detectedEntityTypes: vi.fn().mockReturnValue([]),
    missingEntityTypes: vi.fn().mockReturnValue([]),
}));


vi.mock('../conversation-control', () => ({
    resolveConversationMode: vi.fn().mockResolvedValue({ mode: 'SUPERVISED', reason: 'MVP default', operatorOnline: false }),
}));

vi.mock('../context-resolver', () => ({
    resolveConversationContext: vi.fn().mockResolvedValue({
        customer: { phoneHash: '123', isReturning: true },
        lastQuotes: [{
            simulationId: 'sim-123',
            cep: '01001000',
            productRef: 'Produto X',
            carrierSelected: 'jamef',
            quotedFreight: '25.00'
        }],
        sessionState: {
            currentIntent: 'FRETE',
        }
    }),
}));

vi.mock('../memory/memory.service', () => ({
    recordInboundMessage: vi.fn(),
    recordOutboundMessage: vi.fn(),
}));

// We only need to import the mocked version now
import { handleIncomingMessage } from '../whatsapp-orchestrator';

describe('whatsapp-orchestrator MVP Freeze Guardrails', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should block autonomous high risk execution and suggest operator approval when SUPERVISED_ONLY', async () => {
        const result = await handleIncomingMessage(
            'tenant-1',
            'Aprovo a cotação',
            '5511999999999'
        );

        // The orchestrator must intercept the CONFIRM_QUOTE intent because isFrankSupervisedOnly() is true
        // It should NOT call runTool for create_order_from_quote
        expect(result.reply).toContain('Entendido. Posso gerar o pedido sim-123 para este cliente. Por favor, aprove e finalize usando o painel logístico do atendente.');
        expect(result.carrierSuggested).toBeNull();
    });

});
