import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { twilioProvider } from '@/providers/twilio.provider';
import { whatsappOutboundService } from '../whatsapp-outbound.service';

vi.mock('@/modules/atendimento/conversation.service', () => ({
    conversationService: {
        processOutboundMessage: vi.fn(),
        updateMessageFields: vi.fn(),
    },
}));
vi.mock('@/providers/twilio.provider', () => ({
    twilioProvider: {
        sendMessageDetailed: vi.fn(),
    },
}));

describe('whatsappOutboundService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(conversationService.processOutboundMessage).mockResolvedValue({
            id: 'msg-1',
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Oi',
            metadata: { status: 'queued_for_send' },
            providerMessageId: null,
            deliveryStatus: 'queued',
            createdAt: new Date(),
        } as any);
        vi.mocked(conversationService.updateMessageFields).mockResolvedValue({ id: 'msg-1' } as any);
    });

    it('persists sid and normalizes accepted into queued on the initial outbound send', async () => {
        vi.mocked(twilioProvider.sendMessageDetailed).mockResolvedValue({
            ok: true,
            sid: 'SM123',
            status: 'accepted',
            to: '+5511999999999',
            from: 'whatsapp:+5511000000000',
            attempts: 1,
            providerStatusCode: 201,
        });

        const result = await whatsappOutboundService.sendTrackedMessage({
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            to: '+5511999999999',
            message: 'Oi',
            source: 'OPERATOR',
            actorType: 'HUMAN',
            metadata: { requestId: 'req-1' },
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error('expected success');
        expect(result.normalizedStatus).toBe('queued');
        expect(conversationService.updateMessageFields).toHaveBeenCalledWith('tenant-1', 'msg-1', expect.objectContaining({
            providerMessageId: 'SM123',
            deliveryStatus: 'queued',
        }));
    });

    it('normalizes sending into sent on the initial outbound send', async () => {
        vi.mocked(twilioProvider.sendMessageDetailed).mockResolvedValue({
            ok: true,
            sid: 'SM124',
            status: 'sending',
            to: '+5511999999999',
            from: 'whatsapp:+5511000000000',
            attempts: 1,
            providerStatusCode: 201,
        });

        const result = await whatsappOutboundService.sendTrackedMessage({
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            to: '+5511999999999',
            message: 'Oi',
            source: 'OPERATOR',
            actorType: 'HUMAN',
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error('expected success');
        expect(result.normalizedStatus).toBe('sent');
        expect(conversationService.updateMessageFields).toHaveBeenCalledWith('tenant-1', 'msg-1', expect.objectContaining({
            providerMessageId: 'SM124',
            deliveryStatus: 'sent',
        }));
    });

    it('marks the message as failed when Twilio returns an error', async () => {
        vi.mocked(twilioProvider.sendMessageDetailed).mockResolvedValue({
            ok: false,
            errorCode: 'TWILIO_API_ERROR',
            message: 'upstream error',
            to: '+5511999999999',
            attempts: 1,
            providerStatusCode: 500,
            retryable: true,
        });

        const result = await whatsappOutboundService.sendTrackedMessage({
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            to: '+5511999999999',
            message: 'Oi',
            source: 'OPERATOR',
            actorType: 'HUMAN',
        });

        expect(result.ok).toBe(false);
        expect(conversationService.updateMessageFields).toHaveBeenCalledWith('tenant-1', 'msg-1', expect.objectContaining({
            deliveryStatus: 'failed',
        }));
    });
});
