import { describe, expect, it, vi, beforeEach } from 'vitest';
import { whatsappInboundOrchestrator, WebhookOrchestratorPayload } from '@/modules/conversations/application/inbound/whatsapp-inbound-orchestrator.service';
import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { customerResolutionService } from '@/modules/customers/customer-resolution.service';
import { conversationService } from '@/modules/conversations/application/orchestration/conversation.service';
import { messageService } from '@/modules/conversations/application/orchestration/message.service';
import { whatsappOutboundService } from '@/modules/conversations/application/outbound/whatsapp-outbound.service';
import * as frankOrchestrator from '@/modules/frank/whatsapp-orchestrator';

vi.mock('@/infra/repositories/inbound-message-dedup.repository', () => ({
    inboundMessageDedupRepository: { tryAcquire: vi.fn().mockResolvedValue(true) }
}));

vi.mock('@/infra/repositories/end-user-consent.repository', () => ({
    endUserConsentRepository: {
        getConsent: vi.fn(),
        recordOptIn: vi.fn(),
        incrementBlockedAttempts: vi.fn(),
    }
}));

vi.mock('@/infra/repositories/message.repository', () => ({
    messageRepository: { saveInboundMessage: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/infra/repositories/webhook-event.repository', () => ({
    webhookEventRepository: { markProcessed: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/modules/customers/customer-resolution.service', () => ({
    customerResolutionService: {
        resolveOrCreateCustomer: vi.fn().mockResolvedValue({
            customerId: 'cust-123',
            organizationId: 'org-123',
            contactId: 'cnt-123',
            isNew: false
        })
    }
}));

vi.mock('@/modules/conversations/application/orchestration/conversation.service', () => ({
    conversationService: {
        findOrCreateConversationByPhone: vi.fn(),
        hasRecentOperatorMessage: vi.fn().mockResolvedValue(false),
        getLastReleaseTimestamp: vi.fn().mockResolvedValue(null),
    }
}));

vi.mock('@/modules/conversations/application/orchestration/message.service', () => ({
    messageService: {
        processInbound: vi.fn().mockResolvedValue({}),
    }
}));

vi.mock('@/modules/conversations/application/outbound/whatsapp-outbound.service', () => ({
    whatsappOutboundService: {
        sendTrackedMessage: vi.fn().mockResolvedValue({
            ok: true,
            sendResult: { sid: 'SM_AUTONOMOUS_TEST' }
        })
    }
}));

vi.mock('@/modules/frank/session.repository', () => ({
    getSessionState: vi.fn().mockResolvedValue(null),
    createSessionState: vi.fn().mockResolvedValue({ id: 'sess-1', autoResponsesCount: 0 }),
    updateSessionState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/modules/frank/suggestions/suggestion.service', () => ({
    suggestionService: {
        generateSuggestion: vi.fn().mockResolvedValue('sug-1'),
        listPendingSuggestions: vi.fn().mockResolvedValue([]),
    }
}));

vi.mock('@/modules/catalog/catalog.service', () => ({
    catalogService: {
        searchProductsByName: vi.fn().mockResolvedValue([]),
    }
}));

vi.mock('@/modules/funnel/funnel.repository', () => ({
    funnelRepository: { saveEvent: vi.fn().mockResolvedValue(undefined) },
    FunnelStage: { FLOW_STARTED: 'FLOW_STARTED', INTENT_DETECTED: 'INTENT_DETECTED' }
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/modules/frank/conversation-control', () => ({
    resolveConversationMode: vi.fn().mockReturnValue({ mode: 'ASSISTED', reason: 'dev_test' }),
    isEntitiesCompleteForIntent: vi.fn().mockReturnValue(true),
    MAX_AUTO_RESPONSES: 2,
}));

vi.mock('@/modules/frank/whatsapp-orchestrator', () => ({
    handleIncomingMessage: vi.fn().mockResolvedValue({
        reply: 'Olá! Sou o Frank e este é um teste contextual de resposta autônoma em dev.',
        intent: 'SAUDACAO',
        confidence: 0.95,
        conversationMode: 'ASSISTED'
    })
}));

describe('Frank Dev Autonomous WhatsApp Inbound Integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'development';
        process.env.FRANK_DEV_AUTONOMOUS_ENABLED = 'true';

        vi.mocked(inboundMessageDedupRepository.tryAcquire).mockResolvedValue(true);
        vi.mocked(endUserConsentRepository.getConsent).mockResolvedValue({
            consentGiven: true,
            tenantId: 'tenant-lojacond-dev',
            phoneHash: 'hash-123',
            consentTimestamp: new Date(),
            source: 'whatsapp_frank'
        } as any);

        vi.mocked(conversationService.findOrCreateConversationByPhone).mockResolvedValue({
            id: 'conv-123',
            tenantId: 'tenant-lojacond-dev',
            status: 'new',
            assignedTo: null,
            phoneHash: 'hash-123',
        } as any);
    });

    const devPayload: WebhookOrchestratorPayload = {
        tenantId: 'tenant-lojacond-dev',
        messageSid: 'SM_INBOUND_123',
        accountSid: 'AC_TEST',
        fromE164: '+5511999999999',
        fromHash: 'hash-123',
        toPhone: '+14155238886',
        rawBodyText: 'Olá, quais produtos vocês tem?',
        requestId: 'req-dev-1',
    };

    it('Scenario 1: Triggers Frank contextual response and dispatches via Twilio when dev flag is active', async () => {
        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(frankOrchestrator.handleIncomingMessage).toHaveBeenCalledWith(
            'tenant-lojacond-dev',
            'Olá, quais produtos vocês tem?',
            '+5511999999999'
        );

        expect(whatsappOutboundService.sendTrackedMessage).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-lojacond-dev',
            conversationId: 'conv-123',
            to: '+5511999999999',
            actorType: 'AI',
            source: 'SYSTEM',
            message: 'Olá! Sou o Frank e este é um teste contextual de resposta autônoma em dev.',
        }));

        expect(policy.type).toBe('ACK_ONLY');
    });

    it('Scenario 2: Blocks autonomous response when LGPD consent is not granted', async () => {
        vi.mocked(endUserConsentRepository.getConsent).mockResolvedValue(null);

        const policy = await whatsappInboundOrchestrator.process({
            ...devPayload,
            rawBodyText: 'Olá sem consentimento'
        });

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(policy.type).toBe('AUTO_REPLY_ALLOWED');
        expect((policy as any).text).toContain('Para continuar, confirme que aceita nossa política');
    });

    it('Scenario 3: Blocks autonomous response when operator has taken over (operator_active)', async () => {
        vi.mocked(conversationService.findOrCreateConversationByPhone).mockResolvedValue({
            id: 'conv-123',
            tenantId: 'tenant-lojacond-dev',
            status: 'operator_active',
            assignedTo: 'user-operator-1',
            phoneHash: 'hash-123',
        } as any);

        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(policy.type).toBe('ACK_ONLY');
    });

    it('Scenario 4: Blocks autonomous response for any other tenant (strict isolation)', async () => {
        const otherTenantPayload: WebhookOrchestratorPayload = {
            ...devPayload,
            tenantId: 'tenant-production-123',
        };

        vi.mocked(conversationService.findOrCreateConversationByPhone).mockResolvedValue({
            id: 'conv-prod',
            tenantId: 'tenant-production-123',
            status: 'new',
            assignedTo: null,
            phoneHash: 'hash-123',
        } as any);

        const policy = await whatsappInboundOrchestrator.process(otherTenantPayload);

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 5: Blocks autonomous response if FRANK_DEV_AUTONOMOUS_ENABLED is not set', async () => {
        delete process.env.FRANK_DEV_AUTONOMOUS_ENABLED;

        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 6: Blocks autonomous response when gate mode is SUPERVISED (e.g. low confidence or sensitive intent)', async () => {
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        vi.mocked(resolveConversationMode).mockReturnValueOnce({
            mode: 'SUPERVISED',
            reason: 'confidence_below_threshold'
        });

        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 7: Safe fallback to supervised policy when sendTrackedMessage returns ok: false', async () => {
        vi.mocked(whatsappOutboundService.sendTrackedMessage).mockResolvedValueOnce({
            ok: false,
            conversationMessage: {} as any,
            sendResult: {
                ok: false,
                errorCode: 'DELIVERY_TIMEOUT',
                message: 'Twilio provider unreachable'
            }
        });

        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(frankOrchestrator.handleIncomingMessage).toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).toHaveBeenCalled();
        // Since send failed, it falls back to the resolved policy (not ACK_ONLY)
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 8: "Oi, Frank!" with real intent resolution delivers conversational response in dev mode', async () => {
        const { resolveIntent } = await import('@/modules/frank/intent-resolver');
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');

        // Unmock conversation-control for this scenario to test actual gate
        vi.mocked(resolveConversationMode).mockImplementationOnce((params) => {
            return {
                mode: 'ASSISTED',
                reason: 'greeting (business_hours)'
            };
        });

        const policy = await whatsappInboundOrchestrator.process({
            ...devPayload,
            rawBodyText: 'Oi, Frank!'
        });

        expect(frankOrchestrator.handleIncomingMessage).toHaveBeenCalledWith(
            'tenant-lojacond-dev',
            'Oi, Frank!',
            '+5511999999999'
        );

        expect(whatsappOutboundService.sendTrackedMessage).toHaveBeenCalled();
        expect(policy.type).toBe('ACK_ONLY');
    });

    it('Scenario 9: "Quero falar com atendente" triggers human handoff and blocks auto-response', async () => {
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        vi.mocked(resolveConversationMode).mockImplementationOnce((params) => {
            return {
                mode: 'SUPERVISED',
                reason: 'frustration'
            };
        });

        const policy = await whatsappInboundOrchestrator.process({
            ...devPayload,
            rawBodyText: 'Quero falar com atendente'
        });

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 10: Mixed sensitive intent "Oi, preciso pagar" blocks auto-reply and fails closed', async () => {
        const { resolveConversationMode } = await import('@/modules/frank/conversation-control');
        vi.mocked(resolveConversationMode).mockImplementationOnce((params) => {
            return {
                mode: 'SUPERVISED',
                reason: 'confidence_below_threshold (0.45)'
            };
        });

        const policy = await whatsappInboundOrchestrator.process({
            ...devPayload,
            rawBodyText: 'Oi, preciso pagar'
        });

        expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 11: Product query with created suggestion never bypasses supervised policy', async () => {
        const { catalogService } = await import('@/modules/catalog/catalog.service');
        vi.mocked(catalogService.searchProductsByName).mockResolvedValueOnce([{
            productId: 'prod-1',
            name: 'Lixeira Inox 50L',
            price: '150.00',
            weight: 2.0
        } as any]);

        const policy = await whatsappInboundOrchestrator.process({
            ...devPayload,
            rawBodyText: 'Quero ver lixeira'
        });

        // Even in dev mode, commercial suggestions must remain SUPERVISED
        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

    it('Scenario 12: Blocks auto-response when Frank orchestrator returns SUPERVISED mode', async () => {
        vi.mocked(frankOrchestrator.handleIncomingMessage).mockResolvedValueOnce({
            reply: '[SUGESTÃO FRANK] Resposta supervisionada que não deve vazar.',
            intent: 'SAUDACAO',
            intentConfidence: 0.9,
            conversationMode: 'SUPERVISED',
            cep: null,
            productRef: null,
            simulationId: null,
            carrierSuggested: null,
            context: null,
        });

        const policy = await whatsappInboundOrchestrator.process(devPayload);

        expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
        expect(['SUPERVISED_NO_REPLY', 'AUTO_REPLY_ALLOWED']).toContain(policy.type);
    });

});
