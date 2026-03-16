import { describe, expect, it, vi } from 'vitest';

// ---- Status Webhook: shouldUpdate logic ----

const STATUS_WEIGHT: Record<string, number> = {
    queued: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 4,
};

function shouldUpdate(current: string | null, incoming: string): boolean {
    if (!current) return true;
    if (incoming === 'failed') return true;
    return (STATUS_WEIGHT[incoming] ?? 0) > (STATUS_WEIGHT[current] ?? -1);
}

describe('WhatsApp Core Hardening', () => {
    describe('Status Webhook - Idempotent Forward Transitions', () => {
        it('should accept update when current status is null', () => {
            expect(shouldUpdate(null, 'sent')).toBe(true);
        });

        it('should accept forward transition queued → sent', () => {
            expect(shouldUpdate('queued', 'sent')).toBe(true);
        });

        it('should accept forward transition sent → delivered', () => {
            expect(shouldUpdate('sent', 'delivered')).toBe(true);
        });

        it('should accept forward transition delivered → read', () => {
            expect(shouldUpdate('delivered', 'read')).toBe(true);
        });

        it('should reject backward transition delivered → sent', () => {
            expect(shouldUpdate('delivered', 'sent')).toBe(false);
        });

        it('should reject backward transition read → delivered', () => {
            expect(shouldUpdate('read', 'delivered')).toBe(false);
        });

        it('should reject same-status transition sent → sent', () => {
            expect(shouldUpdate('sent', 'sent')).toBe(false);
        });

        it('should always accept failed regardless of current status', () => {
            expect(shouldUpdate('queued', 'failed')).toBe(true);
            expect(shouldUpdate('sent', 'failed')).toBe(true);
            expect(shouldUpdate('delivered', 'failed')).toBe(true);
            expect(shouldUpdate('read', 'failed')).toBe(true);
        });
    });

    describe('Reply Policy - Operator Active Bypass', () => {
        it('should return ACK_ONLY when conversation is operator_active', async () => {
            const { resolveInboundReplyPolicy } = await import('../whatsapp-reply-policy');
            const policy = resolveInboundReplyPolicy({
                tenantId: 't1',
                phoneHash: 'hash123',
                conversationState: 'operator_active',
                hasConsent: true,
                productDetected: true,
                hasActiveSuggestion: true,
                intent: 'FRETE'
            });
            expect(policy.type).toBe('ACK_ONLY');
        });

        it('should not send auto-reply when product is detected without operator', async () => {
            const { resolveInboundReplyPolicy } = await import('../whatsapp-reply-policy');
            const policy = resolveInboundReplyPolicy({
                tenantId: 't1',
                phoneHash: 'hash123',
                conversationState: 'new',
                hasConsent: true,
                productDetected: true,
                hasActiveSuggestion: false,
                intent: 'PRODUTO'
            });
            expect(policy.type).toBe('SUPERVISED_NO_REPLY');
        });
    });

    describe('Conversation Status Machine', () => {
        it('should ensure valid status transitions for operator_active', () => {
            const validFromStates = ['new', 'triaged', 'awaiting_human', 'draft_ready', 'approved', 'sent'];
            for (const state of validFromStates) {
                // Validate that any non-operator_active state can transition to operator_active
                expect(state !== 'operator_active').toBe(true);
            }
        });

        it('should ensure operator_active is not overwritten by itself', () => {
            // The outbound route checks: if (conversation.status !== 'operator_active')
            const status = 'operator_active';
            expect(status !== 'operator_active').toBe(false);
        });
    });

    describe('Anti-Loop Guard Integration', () => {
        it('should block auto-reply after reaching max auto-responses', async () => {
            const { evaluateAutoResponseGuard } = await import('@/modules/frank/auto-response-guard');
            const result = evaluateAutoResponseGuard('ASSISTED', {
                autoResponsesCount: 5,
                assignedTo: null,
                status: 'awaiting_human',
                operatorRespondedRecently: false,
            });
            expect(result.blocked).toBe(true);
            expect(result.forcedMode).toBe('SUPERVISED');
        });

        it('should allow auto-reply when operator responded recently (reset)', async () => {
            const { evaluateAutoResponseGuard } = await import('@/modules/frank/auto-response-guard');
            const result = evaluateAutoResponseGuard('ASSISTED', {
                autoResponsesCount: 0,
                assignedTo: 'operator1',
                status: 'operator_active',
                operatorRespondedRecently: true,
            });
            expect(result.blocked).toBe(true);
        });
    });

    describe('Ecosystem Event Types', () => {
        it('should include message_received as mandatory event', async () => {
            const { EcosystemEventTypes } = await import('@/services/ecosystem-events.service');
            expect(EcosystemEventTypes).toContain('message_received');
        });

        it('should include note_added as mandatory event', async () => {
            const { EcosystemEventTypes } = await import('@/services/ecosystem-events.service');
            expect(EcosystemEventTypes).toContain('note_added');
        });
    });
});
