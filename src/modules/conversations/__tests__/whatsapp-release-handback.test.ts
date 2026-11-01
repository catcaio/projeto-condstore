import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT as releaseRouteHandler } from '@/app/api/cockpit/conversations/[id]/release/route';
import { whatsappInboundOrchestrator, WebhookOrchestratorPayload } from '@/modules/conversations/application/inbound/whatsapp-inbound-orchestrator.service';
import { conversationService } from '@/modules/conversations/application/orchestration/conversation.service';
import { conversationRepository } from '@/modules/conversations/infrastructure/conversation.repository';
import { requireAdmin } from '@/infra/auth/guards';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { customerResolutionService } from '@/modules/customers/customer-resolution.service';
import { messageService } from '@/modules/conversations/application/orchestration/message.service';
import { whatsappOutboundService } from '@/modules/conversations/application/outbound/whatsapp-outbound.service';
import * as frankOrchestrator from '@/modules/frank/whatsapp-orchestrator';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));

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

vi.mock('@/modules/conversations/application/orchestration/message.service', () => ({
    messageService: {
        processInbound: vi.fn().mockResolvedValue({}),
    }
}));

vi.mock('@/modules/conversations/application/outbound/whatsapp-outbound.service', () => ({
    whatsappOutboundService: {
        sendTrackedMessage: vi.fn().mockResolvedValue({
            ok: true,
            sendResult: { sid: 'SM_RELEASE_HANDBACK_TEST' }
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

vi.mock('@/modules/frank/conversation-control', () => ({
    resolveConversationMode: vi.fn().mockReturnValue({ mode: 'ASSISTED', reason: 'dev_test' }),
    isEntitiesCompleteForIntent: vi.fn().mockReturnValue(true),
    MAX_AUTO_RESPONSES: 2,
}));

vi.mock('@/modules/frank/whatsapp-orchestrator', () => ({
    handleIncomingMessage: vi.fn().mockResolvedValue({
        reply: 'Olá! Sou o Frank e retomei o atendimento com sucesso.',
        intent: 'SAUDACAO',
        confidence: 0.95,
        conversationMode: 'ASSISTED'
    })
}));

describe('WhatsApp Release and Autonomous Handback Flow', () => {
    const originalEnv = process.env;
    const testTenantId = 'tenant-lojacond-dev';
    const testConversationId = 'conv-456';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'development';
        process.env.FRANK_DEV_AUTONOMOUS_ENABLED = 'true';

        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: {
                sub: 'user-operator-1',
                tenantId: testTenantId,
                role: 'admin',
                sessionVersion: 1,
            }
        });

        vi.mocked(endUserConsentRepository.getConsent).mockResolvedValue({
            consentGiven: true,
            tenantId: testTenantId,
            phoneHash: 'hash-456',
            consentTimestamp: new Date(),
            source: 'whatsapp_frank'
        } as any);
    });

    describe('PUT /api/cockpit/conversations/[id]/release', () => {
        it('should return HTTP 200, invoke atomic releaseConversation, and emit events only on success', async () => {
            const spyGetConv = vi.spyOn(conversationService, 'getConversationById').mockResolvedValueOnce({
                id: testConversationId,
                tenantId: testTenantId,
                customerId: 'cust-123',
                status: 'operator_active',
                assignedTo: 'user-operator-1',
            } as any);

            const spyRelease = vi.spyOn(conversationService, 'releaseConversation').mockResolvedValueOnce(undefined);

            const req = new NextRequest(`http://localhost/api/cockpit/conversations/${testConversationId}/release`, {
                method: 'PUT'
            });

            const res = await releaseRouteHandler(req, {
                params: Promise.resolve({ id: testConversationId })
            });

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json).toEqual({ ok: true });

            expect(spyRelease).toHaveBeenCalledWith(
                testTenantId,
                testConversationId,
                'cust-123',
                'user-operator-1'
            );

            spyGetConv.mockRestore();
            spyRelease.mockRestore();
        });

        it('should fail-closed with HTTP 500 when atomic release fails and not emit premature events', async () => {
            const spyGetConv = vi.spyOn(conversationService, 'getConversationById').mockResolvedValueOnce({
                id: testConversationId,
                tenantId: testTenantId,
                customerId: 'cust-123',
                status: 'operator_active',
                assignedTo: 'user-operator-1',
            } as any);

            // Mock repo release failure
            const spyRepoRelease = vi.spyOn(conversationRepository, 'releaseConversation').mockResolvedValueOnce(false);

            const req = new NextRequest(`http://localhost/api/cockpit/conversations/${testConversationId}/release`, {
                method: 'PUT'
            });

            const res = await releaseRouteHandler(req, {
                params: Promise.resolve({ id: testConversationId })
            });

            expect(res.status).toBe(500);
            const json = await res.json();
            expect(json.error.message).toBe('Failed to release conversation');

            // Operational events should NOT have been published for this release
            expect(publishOperationalEvent).not.toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'conversation_unassigned'
            }));
            expect(publishOperationalEvent).not.toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'conversation_status_changed'
            }));

            spyGetConv.mockRestore();
            spyRepoRelease.mockRestore();
        });
    });

    describe('Autonomous Resumption after Explicit Release', () => {
        const payload: WebhookOrchestratorPayload = {
            tenantId: testTenantId,
            messageSid: 'SM_AFTER_RELEASE',
            accountSid: 'AC_TEST',
            fromE164: '+5511988887777',
            fromHash: 'hash-456',
            toPhone: '+14155238886',
            rawBodyText: 'Oi, Frank!',
            requestId: 'req-inbound-after-release',
        };

        it('should resume Frank auto-reply immediately after release even if human sent a message 2 minutes ago', async () => {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000); // Handback happened 1 minute ago (AFTER operator message)

            // Conversation is now in triaged and unassigned after release
            const spyFindConv = vi.spyOn(conversationService, 'findOrCreateConversationByPhone').mockResolvedValueOnce({
                id: testConversationId,
                tenantId: testTenantId,
                status: 'triaged',
                assignedTo: null,
                phoneHash: 'hash-456',
            } as any);

            // Last release was 1 minute ago
            const spyLastRelease = vi.spyOn(conversationService, 'getLastReleaseTimestamp').mockResolvedValueOnce(oneMinuteAgo);

            // Repository check: Operator sent message 2 mins ago, but release was 1 min ago.
            // Therefore, no operator message sent strictly AFTER release.
            const spyHasRecent = vi.spyOn(conversationRepository, 'hasRecentOperatorMessage').mockResolvedValueOnce(false);

            const policy = await whatsappInboundOrchestrator.process(payload);

            expect(spyLastRelease).toHaveBeenCalledWith(testTenantId, testConversationId);
            expect(spyHasRecent).toHaveBeenCalledWith(testTenantId, testConversationId, 15, oneMinuteAgo);

            // Frank generates and dispatches autonomous response
            expect(frankOrchestrator.handleIncomingMessage).toHaveBeenCalledWith(
                testTenantId,
                'Oi, Frank!',
                '+5511988887777'
            );
            expect(whatsappOutboundService.sendTrackedMessage).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: testTenantId,
                conversationId: testConversationId,
                message: 'Olá! Sou o Frank e retomei o atendimento com sucesso.',
            }));
            expect(policy.type).toBe('ACK_ONLY');

            spyFindConv.mockRestore();
            spyLastRelease.mockRestore();
            spyHasRecent.mockRestore();
        });

        it('should immediately block Frank if operator sends a new message after the release', async () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // Release was 10 mins ago

            const spyFindConv = vi.spyOn(conversationService, 'findOrCreateConversationByPhone').mockResolvedValueOnce({
                id: testConversationId,
                tenantId: testTenantId,
                status: 'triaged',
                assignedTo: null,
                phoneHash: 'hash-456',
            } as any);

            const spyLastRelease = vi.spyOn(conversationService, 'getLastReleaseTimestamp').mockResolvedValueOnce(tenMinutesAgo);

            // A human operator sent a new manual message after the release (e.g. 5 minutes ago)
            const spyHasRecent = vi.spyOn(conversationRepository, 'hasRecentOperatorMessage').mockResolvedValueOnce(true);

            const policy = await whatsappInboundOrchestrator.process(payload);

            expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
            expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
            expect(policy.type).toBe('SUPERVISED_NO_REPLY');

            spyFindConv.mockRestore();
            spyLastRelease.mockRestore();
            spyHasRecent.mockRestore();
        });

        it('should block Frank if operator assigns or takes over again (operator_active)', async () => {
            const spyFindConv = vi.spyOn(conversationService, 'findOrCreateConversationByPhone').mockResolvedValueOnce({
                id: testConversationId,
                tenantId: testTenantId,
                status: 'operator_active',
                assignedTo: 'user-operator-2',
                phoneHash: 'hash-456',
            } as any);

            const policy = await whatsappInboundOrchestrator.process(payload);

            expect(frankOrchestrator.handleIncomingMessage).not.toHaveBeenCalled();
            expect(whatsappOutboundService.sendTrackedMessage).not.toHaveBeenCalled();
            expect(policy.type).toBe('ACK_ONLY');

            spyFindConv.mockRestore();
        });
    });
});
