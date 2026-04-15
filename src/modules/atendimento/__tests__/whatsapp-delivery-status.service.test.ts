import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { getDb } from '@/infra/db';
import {
    whatsappDeliveryStatusService,
    normalizeTwilioDeliveryStatus,
    resolveInitialOutboundDeliveryStatus,
    classifyDeliveryStatusTransition,
} from '../whatsapp-delivery-status.service';

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/modules/atendimento/conversation.service', () => ({
    conversationService: {
        getMessageByProviderMessageId: vi.fn(),
    },
}));
vi.mock('@/services/ecosystem-events.service', () => ({
    ecosystemEventsService: {
        emitEvent: vi.fn().mockResolvedValue('evt-1'),
    },
}));
vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('whatsappDeliveryStatusService', () => {
    const tx: any = {
        update: vi.fn(() => tx),
        set: vi.fn(() => tx),
        where: vi.fn().mockResolvedValue(undefined),
        insert: vi.fn(() => tx),
        values: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getDb).mockResolvedValue({
            transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
        } as any);
    });

    it('normalizes provider statuses into the internal vocabulary', () => {
        expect(normalizeTwilioDeliveryStatus('accepted')).toBe('queued');
        expect(normalizeTwilioDeliveryStatus('sending')).toBe('sent');
        expect(normalizeTwilioDeliveryStatus('undelivered')).toBe('failed');
        expect(resolveInitialOutboundDeliveryStatus('')).toBe('queued');
        expect(classifyDeliveryStatusTransition('sent', 'delivered')).toBe('apply');
        expect(classifyDeliveryStatusTransition('delivered', 'sent')).toBe('out_of_order');
    });

    it('updates an outbound message to delivered', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue({
            id: 'msg-1',
            tenantId: 'tenant-1',
            conversationId: 'conv-1',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Oi',
            metadata: { status: 'sent_ok' },
            providerMessageId: 'SM123',
            deliveryStatus: 'sent',
            createdAt: new Date(),
        } as any);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM123',
            providerStatus: 'delivered',
            callbackReceivedAt: new Date('2026-04-13T12:00:00.000Z'),
        });

        expect(result).toMatchObject({
            outcome: 'updated',
            normalizedStatus: 'delivered',
            previousStatus: 'sent',
            messageId: 'msg-1',
        });
        expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ deliveryStatus: 'delivered' }));
        expect(tx.values).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'delivery_status_changed',
            payload: expect.objectContaining({ sid: 'SM123', normalizedStatus: 'delivered' }),
        }));
        expect(ecosystemEventsService.emitEvent).not.toHaveBeenCalled();
    });

    it('updates failed status and publishes MESSAGE_DELIVERY_FAILED', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue({
            id: 'msg-2',
            tenantId: 'tenant-2',
            conversationId: 'conv-2',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Teste',
            metadata: null,
            providerMessageId: 'SM234',
            deliveryStatus: 'sent',
            createdAt: new Date(),
        } as any);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM234',
            providerStatus: 'failed',
            providerErrorCode: '30003',
            providerErrorMessage: 'Blocked destination',
            callbackReceivedAt: new Date('2026-04-13T12:10:00.000Z'),
        });

        expect(result).toMatchObject({ outcome: 'updated', normalizedStatus: 'failed' });
        expect(tx.values).toHaveBeenNthCalledWith(1, expect.objectContaining({
            eventType: 'delivery_status_changed',
        }));
        expect(tx.values).toHaveBeenNthCalledWith(2, expect.objectContaining({
            eventType: 'MESSAGE_DELIVERY_FAILED',
            payload: expect.objectContaining({
                sid: 'SM234',
                providerStatus: 'failed',
                normalizedStatus: 'failed',
                providerErrorCode: '30003',
            }),
        }));
        expect(ecosystemEventsService.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-2',
            type: 'message_delivery_failed',
            entityId: 'msg-2',
            payload: expect.objectContaining({ sid: 'SM234' }),
        }));
    });

    it('treats undelivered as failed and keeps provider status in the payload', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue({
            id: 'msg-3',
            tenantId: 'tenant-3',
            conversationId: 'conv-3',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Teste',
            metadata: null,
            providerMessageId: 'SM345',
            deliveryStatus: 'sent',
            createdAt: new Date(),
        } as any);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM345',
            providerStatus: 'undelivered',
            providerErrorMessage: 'Carrier rejected',
        });

        expect(result.normalizedStatus).toBe('failed');
        expect(tx.values).toHaveBeenNthCalledWith(2, expect.objectContaining({
            payload: expect.objectContaining({ providerStatus: 'undelivered' }),
        }));
    });

    it('is idempotent for duplicate callbacks', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue({
            id: 'msg-4',
            tenantId: 'tenant-4',
            conversationId: 'conv-4',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Teste',
            metadata: null,
            providerMessageId: 'SM456',
            deliveryStatus: 'delivered',
            createdAt: new Date(),
        } as any);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM456',
            providerStatus: 'delivered',
        });

        expect(result.outcome).toBe('duplicate');
        expect(getDb).not.toHaveBeenCalled();
    });

    it('returns message_not_found when the sid does not exist', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue(undefined);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM999',
            providerStatus: 'delivered',
        });

        expect(result).toMatchObject({ outcome: 'message_not_found', normalizedStatus: 'delivered' });
        expect(getDb).not.toHaveBeenCalled();
    });

    it('ignores unknown statuses explicitly', async () => {
        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM777',
            providerStatus: 'mystery_status',
        });

        expect(result).toEqual({ outcome: 'ignored_unknown_status', providerStatus: 'mystery_status' });
        expect(conversationService.getMessageByProviderMessageId).not.toHaveBeenCalled();
    });

    it('ignores out-of-order callbacks', async () => {
        vi.mocked(conversationService.getMessageByProviderMessageId).mockResolvedValue({
            id: 'msg-5',
            tenantId: 'tenant-5',
            conversationId: 'conv-5',
            direction: 'outbound',
            source: 'OPERATOR',
            message: 'Teste',
            metadata: null,
            providerMessageId: 'SM567',
            deliveryStatus: 'delivered',
            createdAt: new Date(),
        } as any);

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid: 'SM567',
            providerStatus: 'sent',
        });

        expect(result.outcome).toBe('ignored_out_of_order');
        expect(getDb).not.toHaveBeenCalled();
    });
});
