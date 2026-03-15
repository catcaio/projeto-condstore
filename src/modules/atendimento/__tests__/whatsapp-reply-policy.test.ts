import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveInboundReplyPolicy } from '../whatsapp-reply-policy';

describe('WhatsApp Reply Policy', () => {
    it('Should return AUTO_REPLY with LGPD consent text if no consent', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'new',
            hasConsent: false, productDetected: false, hasActiveSuggestion: false, intent: 'UNKNOWN'
        });
        expect(policy.type).toBe('AUTO_REPLY_ALLOWED');
        expect((policy as any).text).toContain('política de privacidade');
    });

    it('Should ACK_ONLY when conversation is operator_active', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'operator_active',
            hasConsent: true, productDetected: true, hasActiveSuggestion: false, intent: 'PRODUTO'
        });
        expect(policy.type).toBe('ACK_ONLY');
    });

    it('Should SUPERVISED_NO_REPLY when product is detected', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'WAITING_INTERNAL', // Use cast internally
            hasConsent: true, productDetected: true, hasActiveSuggestion: false, intent: 'PRODUTO'
        } as any);
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
    });
    
    it('Should SUPERVISED_NO_REPLY when suggestion is active even without product', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'WAITING_INTERNAL',
            hasConsent: true, productDetected: false, hasActiveSuggestion: true, intent: 'GENERIC_QUESTION'
        } as any);
        expect(policy.type).toBe('SUPERVISED_NO_REPLY');
    });

    it('Should AUTO_REPLY with default text for fallback intents', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'new',
            hasConsent: true, productDetected: false, hasActiveSuggestion: false, intent: 'UNKNOWN'
        });
        expect(policy.type).toBe('AUTO_REPLY_ALLOWED');
        expect((policy as any).text).toContain('Em instantes seguimos');
    });
    
    it('Should AUTO_REPLY with system message if provided', () => {
        const policy = resolveInboundReplyPolicy({
            tenantId: 't1', phoneHash: '123', conversationState: 'new',
            hasConsent: true, productDetected: false, hasActiveSuggestion: false, intent: 'UNKNOWN',
            systemMessage: 'Erro de sistema local'
        });
        expect(policy.type).toBe('AUTO_REPLY_ALLOWED');
        expect((policy as any).text).toBe('Erro de sistema local');
    });
});
