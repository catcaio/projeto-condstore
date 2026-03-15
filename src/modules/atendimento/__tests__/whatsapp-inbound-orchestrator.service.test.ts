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

// We observe intent usage to verify if it was correctly bypassed
vi.spyOn(intentResolver, 'resolveIntent');

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
        expect(catalogService.searchProductsByName).not.toHaveBeenCalled();
        expect(suggestionService.generateSuggestion).not.toHaveBeenCalled();
    });

    it('Should allow normal flow and detect products', async () => {
        const payloadWithProduct = { ...defaultPayload, rawBodyText: 'Quero um carrinho 240l' };
        
        (catalogService.searchProductsByName as any).mockResolvedValue([{ productId: 'prod1', weight: 1 }]);
        
        const policy = await whatsappInboundOrchestrator.process(payloadWithProduct);
        
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        expect(intentResolver.resolveIntent).toHaveBeenCalled();
        expect(catalogService.searchProductsByName).toHaveBeenCalled();
        expect(suggestionService.generateSuggestion).toHaveBeenCalled();
    });
});
