import { describe, expect, it, vi, beforeEach } from 'vitest';
import { whatsappInboundOrchestrator } from '../whatsapp-inbound-orchestrator.service';
import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { messageRepository } from '@/infra/repositories/message.repository';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import * as intentResolver from '@/modules/frank/intent-resolver';

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
    conversationService: { findOrCreateConversationByPhone: vi.fn() }
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
    createSessionState: vi.fn(),
    updateSessionState: vi.fn()
}));

vi.mock('@/modules/frank/conversation-control', () => ({
    resolveConversationMode: vi.fn()
}));

vi.mock('@/modules/pedidos/order.repository', () => ({
    findOrderWithShipmentByPrefix: vi.fn()
}));

// We observe intent usage to verify if it was correctly bypassed
vi.spyOn(intentResolver, 'resolveIntent');
vi.spyOn(intentResolver, 'resolveContextualIntent');

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
        expect(intentResolver.resolveIntent).not.toHaveBeenCalled();
        expect(intentResolver.resolveContextualIntent).not.toHaveBeenCalled();
    });

    it('Should abort AI processing when HUMAN_ACTIVE', async () => {
        (conversationService.findOrCreateConversationByPhone as any).mockResolvedValue({
             id: 'c1', status: 'HUMAN_ACTIVE' 
        });
        
        const policy = await whatsappInboundOrchestrator.process(defaultPayload);
        
        expect(policy.type).toBe('ACK_ONLY');
        const { messageService } = await import('@/modules/atendimento/message.service');
        expect(messageService.processInbound).toHaveBeenCalled();
        
        // Ensure NLP and Catalog are skipped to save costs and avoid noise
        expect(intentResolver.resolveIntent).not.toHaveBeenCalled();
        expect(intentResolver.resolveContextualIntent).not.toHaveBeenCalled();
        expect(catalogService.searchProductsByName).not.toHaveBeenCalled();
        expect(suggestionService.generateSuggestion).not.toHaveBeenCalled();
    });

    it('Should allow normal flow and detect products', async () => {
        const payloadWithProduct = { ...defaultPayload, rawBodyText: 'Quero um carrinho 240l' };
        
        (catalogService.searchProductsByName as any).mockResolvedValue([{ productId: 'prod1', weight: 1 }]);
        
        const policy = await whatsappInboundOrchestrator.process(payloadWithProduct);
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        expect(intentResolver.resolveContextualIntent).toHaveBeenCalled();
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
        
        expect(intentResolver.resolveContextualIntent).toHaveBeenCalledWith('tem rastreio?', expect.objectContaining({
            lastReferencedOrderId: 'ord_123',
            previousIntent: 'ORDER_STATUS'
        }));
        
        expect(updateSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            currentIntent: 'SHIPMENT_STATUS'
        }));
    });

    it('Should fallback to standard intent when no session state exists', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'quero ver os produtos' };
        
        const { getSessionState, createSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);

        await whatsappInboundOrchestrator.process(payload);
        
        expect(intentResolver.resolveContextualIntent).toHaveBeenCalledWith('quero ver os produtos', null);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
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
        
        const { getSessionState, createSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);
        
        const { findOrderWithShipmentByPrefix } = await import('@/modules/pedidos/order.repository');
        (findOrderWithShipmentByPrefix as any).mockResolvedValue({
            orderId: 'uuid-1234',
            shipmentId: 'ship-5678'
        });

        await whatsappInboundOrchestrator.process(payload);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            lastOrderId: 'uuid-1234',
            lastReferencedShipmentId: 'ship-5678',
            currentIntent: expect.any(String)
        }));
    });

    it('Should safely ignore invalid order without crashing and not persist anchor', async () => {
        const payload = { ...defaultPayload, rawBodyText: 'onde esta o pedido 99999?' };
        
        const { getSessionState, createSessionState } = await import('@/modules/frank/session.repository');
        (getSessionState as any).mockResolvedValue(null);
        
        const { findOrderWithShipmentByPrefix } = await import('@/modules/pedidos/order.repository');
        (findOrderWithShipmentByPrefix as any).mockResolvedValue(null); // Not found

        await whatsappInboundOrchestrator.process(payload);
        
        expect(createSessionState).toHaveBeenCalledWith('t1', 'hash', expect.objectContaining({
            currentIntent: expect.any(String)
        }));
        // Should purely persist intent, omitting lastOrderId mapping
        const callArgs = (createSessionState as any).mock.calls[0][2];
        expect(callArgs).not.toHaveProperty('lastOrderId');
        expect(callArgs).not.toHaveProperty('lastReferencedShipmentId');
    });
});
