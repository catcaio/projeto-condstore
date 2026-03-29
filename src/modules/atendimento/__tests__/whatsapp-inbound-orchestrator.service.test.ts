import { describe, expect, it, vi, beforeEach } from 'vitest';
import { whatsappInboundOrchestrator } from '../whatsapp-inbound-orchestrator.service';
import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { messageRepository } from '@/infra/repositories/message.repository';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';

const mockResolveIntent = vi.fn().mockReturnValue({ intent: 'SUPPORT', confidence: 0.9, entities: [] });
const mockResolveContextualIntent = vi.fn().mockImplementation((text: string) => {
    if (text === 'tem rastreio?') return { intent: 'SHIPMENT_STATUS', confidence: 0.9, entities: [] };
    if (text === 'quero ver os produtos') return { intent: 'CATALOG', confidence: 0.9, entities: [] };
    return { intent: 'SUPPORT', confidence: 0.9, entities: [] };
});

vi.mock('@/modules/frank/intent-resolver', () => ({
    resolveIntent: (...args: any[]) => mockResolveIntent(...args),
    resolveContextualIntent: (...args: any[]) => mockResolveContextualIntent(...args)
}));

// Removed vi.mock for entity-resolver so existing tests don't break.

vi.mock('@/infra/repositories/inbound-message-dedup.repository', () => ({
    inboundMessageDedupRepository: { tryAcquire: vi.fn() }
}));

vi.mock('@/infra/repositories/end-user-consent.repository', () => ({
    endUserConsentRepository: { getConsent: vi.fn(), recordOptIn: vi.fn(), incrementBlockedAttempts: vi.fn() }
}));

vi.mock('@/infra/repositories/message.repository', () => ({
    messageRepository: { saveInboundMessage: vi.fn() }
}));

vi.mock('@/infra/repositories/webhook-event.repository', () => ({
    webhookEventRepository: { markProcessed: vi.fn() }
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn()
}));

vi.mock('@/infra/repositories/attribution-click.repository', () => ({
    attributionClickRepository: { consumeByToken: vi.fn() }
}));

vi.mock('@/infra/attribution/token-parser', () => ({
    extractAttributionTokenFromText: vi.fn()
}));

vi.mock('@/modules/customers/identity-resolver/identity-resolver.service', () => ({
    resolveCustomerByPhone: vi.fn()
}));

vi.mock('@/modules/customers/customer-resolution.service', () => ({
    customerResolutionService: { resolveOrCreateCustomer: vi.fn() }
}));

vi.mock('@/modules/atendimento/message.service', () => ({
    messageService: { processInbound: vi.fn() }
}));

vi.mock('@/modules/atendimento/conversation.service', () => ({
    conversationService: { 
        findOrCreateConversationByPhone: vi.fn(),
        hasRecentOperatorMessage: vi.fn()
    }
}));

vi.mock('@/modules/catalog/catalog.service', () => ({
    catalogService: { searchProductsByName: vi.fn() }
}));

vi.mock('@/modules/freight/freight.service', () => ({
    freightService: { simulateFreightQuote: vi.fn() }
}));

vi.mock('@/modules/frank/suggestions/suggestion.service', () => ({
    suggestionService: { generateSuggestion: vi.fn() }
}));

vi.mock('@/modules/frank/session.repository', () => ({
    getSessionState: vi.fn(),
    createSessionState: vi.fn().mockResolvedValue({ id: 'mock-session-id' }),
    updateSessionState: vi.fn().mockResolvedValue({ id: 'mock-session-id' })
}));

vi.mock('@/modules/frank/conversation-control', () => ({
    resolveConversationMode: vi.fn(),
    isEntitiesCompleteForIntent: vi.fn().mockReturnValue(true)
}));

vi.mock('@/modules/pedidos/order.repository', () => ({
    findOrderWithShipmentByPrefix: vi.fn()
}));

vi.mock('@/modules/funnel/funnel.repository', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/funnel/funnel.repository')>();
    return {
        ...actual,
        funnelRepository: { saveEvent: vi.fn() }
    };
});

// We observe intent usage to verify if it was correctly bypassed

describe('WhatsApp Inbound Orchestrator', () => {
    const defaultPayload = {
        tenantId: 't1', messageSid: 'm1', accountSid: 'a1',
        fromE164: '+5511999999999', fromHash: 'hash', toPhone: 'to',
        rawBodyText: 'Mensagem de teste', requestId: 'Req1'
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        (inboundMessageDedupRepository.tryAcquire as any).mockResolvedValue(true);
        (endUserConsentRepository.getConsent as any).mockResolvedValue({ consentGiven: true });
        (conversationService.findOrCreateConversationByPhone as any).mockResolvedValue({ id: 'c1', status: 'OPEN', stage: 'NEW_LEAD' });
        (conversationService.hasRecentOperatorMessage as any).mockResolvedValue(false);
        
        const { customerResolutionService } = await import('@/modules/customers/customer-resolution.service');
        (customerResolutionService.resolveOrCreateCustomer as any).mockResolvedValue({
            customerId: 'cust1',
            organizationId: 'org1',
            contactId: 'cnt1',
            isNew: false
        });
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        (resolveConversationMode as any).mockReturnValue({ mode: 'ASSISTED', reason: 'test_default' });
    });

    it('Should block duplicate webhooks (Idempotent)', async () => {
        (inboundMessageDedupRepository.tryAcquire as any).mockResolvedValue(false);
        const policy = await whatsappInboundOrchestrator.process(defaultPayload);
        expect(policy.type).toBe('ACK_ONLY');
        expect(endUserConsentRepository.getConsent).not.toHaveBeenCalled();
    });

    it('Should block without LGPD consent and send warning', async () => {
        (endUserConsentRepository.getConsent as any).mockResolvedValue(null);
        const policy = await whatsappInboundOrchestrator.process(defaultPayload);
        
        expect(policy.type).toBe('AUTO_REPLY_ALLOWED');
        expect((policy as any).text).toContain('política de privacidade');
        
        // Ensure no identity/AI processing happens
        const { messageService } = await import('@/modules/atendimento/message.service');
        expect(messageService.processInbound).not.toHaveBeenCalled();
        expect(catalogService.searchProductsByName).not.toHaveBeenCalled();
        expect(mockResolveIntent).not.toHaveBeenCalled();
        expect(mockResolveContextualIntent).not.toHaveBeenCalled();
    });

    it('Should abort AI processing when operator_active', async () => {
        (conversationService.findOrCreateConversationByPhone as any).mockResolvedValue({
             id: 'c1', status: 'operator_active' 
        });
        
        const policy = await whatsappInboundOrchestrator.process(defaultPayload);
        
        expect(policy.type).toBe('ACK_ONLY');
        const { messageService } = await import('@/modules/atendimento/message.service');
        expect(messageService.processInbound).toHaveBeenCalled();
        
        // Ensure NLP and Catalog are skipped to save costs and avoid noise
        expect(mockResolveIntent).not.toHaveBeenCalled();
        expect(mockResolveContextualIntent).not.toHaveBeenCalled();
        expect(catalogService.searchProductsByName).not.toHaveBeenCalled();
        expect(suggestionService.generateSuggestion).not.toHaveBeenCalled();
    });

    it('Should allow normal flow and detect products', async () => {
        const payloadWithProduct = { ...defaultPayload, rawBodyText: 'Quero um carrinho 240l' };
        
        (catalogService.searchProductsByName as any).mockResolvedValue([{ productId: 'prod1', weight: 1 }]);
        
        const policy = await whatsappInboundOrchestrator.process(payloadWithProduct);
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        expect(mockResolveContextualIntent).toHaveBeenCalled();
        expect(catalogService.searchProductsByName).toHaveBeenCalled();
        expect(suggestionService.generateSuggestion).toHaveBeenCalled();
    });

    it('Should use contextual intent for ambiguous follow-up when session anchors exist', async () => {
        const payloadFollowUp = { ...defaultPayload, rawBodyText: 'tem rastreio?' };
        
        const { getSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue({
            currentIntent: 'ORDER_STATUS',
            lastOrderId: 'ord_123'
        });

        await whatsappInboundOrchestrator.process(payloadFollowUp);
        
        expect(mockResolveContextualIntent).toHaveBeenCalledWith('tem rastreio?', expect.objectContaining({
            lastReferencedOrderId: 'ord_123',
            previousIntent: 'ORDER_STATUS'
        }));
        
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            currentIntent: 'SHIPMENT_STATUS'
        }));
    });

    it('Should fallback to standard intent when no session state exists', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'quero ver os produtos' };
        
        const { getSessionState, createSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);

        await whatsappInboundOrchestrator.process(payload);
        
        expect(mockResolveContextualIntent).toHaveBeenCalledWith('quero ver os produtos', null);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash');
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            currentIntent: expect.any(String)
        }));
    });

    it('Should override AUTO_REPLY_ALLOWED when conversation mode demands SUPERVISED', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Eu quero falar com um humano' };
        
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        (resolveConversationMode as any).mockReturnValue({ mode: 'SUPERVISED', reason: 'frustration' });

        const policy = await whatsappInboundOrchestrator.process(payload);
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        expect((policy as any).text).toBeUndefined();
    });

    it('Should persist order and shipment anchors when resolved successfully', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'onde esta o pedido 12345?' };
        
        const { getSessionState, createSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);
        
        const { findOrderWithShipmentByPrefix } = await import('@/modules/pedidos/order.repository');
        (findOrderWithShipmentByPrefix as any).mockResolvedValue({
            orderId: 'uuid-1234',
            shipmentId: 'ship-5678'
        });

        await whatsappInboundOrchestrator.process(payload);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash');
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            lastOrderId: 'uuid-1234',
            lastReferencedShipmentId: 'ship-5678',
            currentIntent: expect.any(String)
        }));
    });

    it('Should safely ignore invalid order without crashing and not persist anchor', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'onde esta o pedido 99999?' };
        
        const { getSessionState, createSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);
        
        const { findOrderWithShipmentByPrefix } = await import('@/modules/pedidos/order.repository');
        (findOrderWithShipmentByPrefix as any).mockResolvedValue(null); // Not found

        await whatsappInboundOrchestrator.process(payload);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash');
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            currentIntent: expect.any(String)
        }));
        // Should purely persist intent, omitting lastOrderId mapping
        const callArgs = (updateSessionState as any).mock.calls[0][2];
        expect(callArgs).not.toHaveProperty('lastOrderId');
        expect(callArgs).not.toHaveProperty('lastReferencedShipmentId');
    });

    it('Should block auto-response when autoResponsesCount limits are reached (Loop Guard)', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Mensagem qualquer' };
        
        const { getSessionState } = await import('@/modules/frank/session.repository');
        // Setting autoResponsesCount to 3, which is > MAX_AUTO_RESPONSES (2)
        (getSessionState as any).mockResolvedValue({
            autoResponsesCount: 3
        });
        
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        (resolveConversationMode as any).mockReturnValue({ mode: 'ASSISTED', reason: 'informational_high_confidence' });
        
        const policy = await whatsappInboundOrchestrator.process(payload);
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
    });

    it('Should reset autoResponsesCount if operator responded recently', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Mensagem qualquer' };
        
        const { getSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        // Was at limit 3, but operator has replied!
        (getSessionState as any).mockResolvedValue({
            autoResponsesCount: 3
        });
        
        // Mock that operator responded recently, resetting loop check
        (conversationService.hasRecentOperatorMessage as any).mockResolvedValue(true);
        
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        (resolveConversationMode as any).mockReturnValue({ mode: 'ASSISTED', reason: 'informational_high_confidence' });
        
        const policy = await whatsappInboundOrchestrator.process(payload);
        
        // Because the mode is ASSISTED and the operator responded recently, 
        // the auto-response loop guard will STILL BLOCK because operator presence (operatorRespondedRecently=true) forces SUPERVISED.
        // Wait, yes, operator presence forces SUPERVISED globally. Let's assert that!
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        
        // But crucially, the autoResponsesCount should have been reset to 0 in the updateSessionState call
        // Wait, if it was blocked by guard, policy is SUPERVISED_NO_REPLY. 
        // So updateSessionState should be called with autoResponsesCount: 0 (since it's not incremented).
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            autoResponsesCount: 0
        }));
    });
    it('Should pass entitiesComplete signal to resolveConversationMode gate', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Frete para 12345-678 de uma mesa' };
        
        const { isEntitiesCompleteForIntent, resolveConversationMode } = await import('@/modules/frank/conversation-control');
        (isEntitiesCompleteForIntent as any).mockReturnValueOnce(false);
        (resolveConversationMode as any).mockReturnValue({ mode: 'SUPERVISED', reason: 'incomplete_entities' });
        
        const policy = await whatsappInboundOrchestrator.process(payload);
        
        expect(isEntitiesCompleteForIntent).toHaveBeenCalled();
        expect(resolveConversationMode).toHaveBeenCalledWith(expect.objectContaining({
            entitiesComplete: false
        }));
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
    });

    it('Should extract and consume attribution token, and persist in session', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Mensagem teste t=attr_token_999' };
        
        const { getSessionState, createSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);
        
        const { extractAttributionTokenFromText } = await import('@/infra/attribution/token-parser');
        (extractAttributionTokenFromText as any).mockReturnValue('attr_token_999');

        const { attributionClickRepository } = await import('@/infra/repositories/attribution-click.repository');
        (attributionClickRepository.consumeByToken as any).mockResolvedValue({
            attribution: {
                utmSource: 'meta',
                utmCampaign: 'blackfriday',
                utmMedium: 'cpc'
            }
        });

        await whatsappInboundOrchestrator.process(payload);

        expect(extractAttributionTokenFromText).toHaveBeenCalledWith('Mensagem teste t=attr_token_999');
        expect(attributionClickRepository.consumeByToken).toHaveBeenCalledWith('attr_token_999', expect.any(Object));

        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash');
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            attributionToken: 'attr_token_999',
            utmSource: 'meta',
            utmCampaign: 'blackfriday',
            utmMedium: 'cpc'
        }));
    });

    it('Should override session UTMs with new attribution token and normalize empty strings', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'Mensagem teste t=attr_token_NEW' };
        
        const { getSessionState, updateSessionState } = await import('@/modules/frank/session.repository');
        // Old session state with UTMs
        (getSessionState as any).mockResolvedValue({
            attributionToken: 'attr_token_OLD',
            utmSource: 'google',
            utmMedium: 'cpc',
            utmCampaign: 'verao'
        });
        
        const { extractAttributionTokenFromText } = await import('@/infra/attribution/token-parser');
        (extractAttributionTokenFromText as any).mockReturnValue('attr_token_NEW');

        const { attributionClickRepository } = await import('@/infra/repositories/attribution-click.repository');
        (attributionClickRepository.consumeByToken as any).mockResolvedValue({
            attribution: {
                utmSource: 'meta',
                utmCampaign: '', // Should be normalized to null
                utmMedium: 'social'
            }
        });

        const { funnelRepository } = await import('@/modules/funnel/funnel.repository');

        await whatsappInboundOrchestrator.process(payload);

        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            attributionToken: 'attr_token_NEW',
            utmSource: 'meta',
            utmCampaign: null, // Empty string normalized
            utmMedium: 'social'
        }));

        // Verify funnel event uses the NEW attribution
        expect(funnelRepository.saveEvent).toHaveBeenCalledWith(expect.objectContaining({
            stage: 'FLOW_STARTED',
            attribution: {
                refToken: 'attr_token_NEW',
                utmSource: 'meta',
                utmCampaign: null,
                utmMedium: 'social'
            }
        }));
    });

    it('Shield 3: Should not crash inbound flow if attribution consumeByToken throws', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'ola token attr_crash' };
        
        const { getSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue({ id: 'sess_123' });

        const { extractAttributionTokenFromText } = await import('@/infra/attribution/token-parser');
        (extractAttributionTokenFromText as any).mockReturnValue('attr_crash');

        const { attributionClickRepository } = await import('@/infra/repositories/attribution-click.repository');
        (attributionClickRepository.consumeByToken as any).mockRejectedValue(new Error('DB Timeout'));

        const { funnelRepository } = await import('@/modules/funnel/funnel.repository');

        const policy = await whatsappInboundOrchestrator.process(payload);
        
        // Assert orchestrator did not crash
        expect(policy).toBeDefined();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED', 'ACK_ONLY']).toContain(policy.type);
        
        // Assert funnel continued saving events
        expect(funnelRepository.saveEvent).toHaveBeenCalledWith(expect.objectContaining({
            stage: 'FLOW_STARTED'
        }));
    });

    it('Shield 4: Should use real sessionState.id, not fromHash, in funnel events', async () => {
        const payload = { ...defaultPayload, fromHash: 'invalid_hash_should_not_be_used' };
        
        const { getSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue({ id: 'real_uuid_1234' });

        const { funnelRepository } = await import('@/modules/funnel/funnel.repository');

        await whatsappInboundOrchestrator.process(payload);

        expect(funnelRepository.saveEvent).toHaveBeenCalledWith(expect.objectContaining({
            sessionId: 'real_uuid_1234', // Must be real UUID
            stage: 'FLOW_STARTED'
        }));
    });

    it('Shield 5.1: Should NOT emit QUANTITY_PROVIDED if quantity is inferred or absent', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'CEP 01000-000' };
        
        const { getSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue({ id: 'sess_123' });

        const entityResolver = await import('@/modules/frank/entity-resolver');
        const spy = vi.spyOn(entityResolver, 'resolveEntities').mockReturnValue({
            entities: { quantity: null, product: null, orderId: null, documentType: null, volume: null },
            confidence: 0.5,
            raw: 'CEP 01000-000'
        });

        const { funnelRepository } = await import('@/modules/funnel/funnel.repository');
        (funnelRepository.saveEvent as any).mockClear();

        await whatsappInboundOrchestrator.process(payload);

        const emitCalls = (funnelRepository.saveEvent as any).mock.calls;
        const hasQuantityEmit = emitCalls.some((call: any[]) => call[0].stage === 'QUANTITY_PROVIDED');
        
        expect(hasQuantityEmit).toBe(false);
        spy.mockRestore();
    });

    it('Shield 5.2: Should emit QUANTITY_PROVIDED if quantity is explicitly provided', async () => {
        const payload = { ...defaultPayload, rawBodyText: '5 unidades para 01000-000' };
        
        const { getSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue({ id: 'sess_123' });

        const entityResolver = await import('@/modules/frank/entity-resolver');
        const spy = vi.spyOn(entityResolver, 'resolveEntities').mockReturnValue({
            entities: { quantity: 5, product: null, orderId: null, documentType: null, volume: null }, 
            confidence: 0.9,
            raw: '5 unidades para 01000-000'
        });

        const { funnelRepository } = await import('@/modules/funnel/funnel.repository');
        (funnelRepository.saveEvent as any).mockClear();

        await whatsappInboundOrchestrator.process(payload);

        const emitCalls = (funnelRepository.saveEvent as any).mock.calls;
        const hasQuantityEmit = emitCalls.some((call: any[]) => call[0].stage === 'QUANTITY_PROVIDED');
        
        expect(hasQuantityEmit).toBe(true);
        spy.mockRestore();
    });
});
