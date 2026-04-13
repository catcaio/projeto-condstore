import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { verifyTwilioSignature } from '@/lib/security/webhook-verifier';
import { rateLimiter } from '@/infra/security/rate-limiter';
import { whatsappDeliveryStatusService } from '@/modules/atendimento/whatsapp-delivery-status.service';

vi.mock('@/infra/security/rate-limiter', () => ({
    rateLimiter: { limit: vi.fn() },
    hashRateLimitKeyForLog: vi.fn().mockReturnValue('hashed-key'),
}));
vi.mock('@/lib/security/webhook-verifier', () => ({
    verifyTwilioSignature: vi.fn(),
}));
vi.mock('@/modules/atendimento/whatsapp-delivery-status.service', () => ({
    whatsappDeliveryStatusService: {
        updateDeliveryStatus: vi.fn(),
    },
}));
vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('POST /api/whatsapp/status', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'production', APP_URL: 'http://localhost:3000' } as any;
        vi.mocked(verifyTwilioSignature).mockReturnValue(true);
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: true } as any);
        vi.mocked(whatsappDeliveryStatusService.updateDeliveryStatus).mockResolvedValue({
            outcome: 'updated',
            providerStatus: 'delivered',
            normalizedStatus: 'delivered',
            messageId: 'msg-1',
            conversationId: 'conv-1',
        } as any);
    });

    it('returns empty xml for invalid content type', async () => {
        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ MessageSid: 'SM123' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
        expect(whatsappDeliveryStatusService.updateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('rejects invalid signatures in production', async () => {
        vi.mocked(verifyTwilioSignature).mockReturnValue(false);
        const body = new URLSearchParams({ MessageSid: 'SM123', MessageStatus: 'delivered' }).toString();
        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-twilio-signature': 'invalid',
            },
            body,
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
        expect(whatsappDeliveryStatusService.updateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('returns empty xml when required fields are missing', async () => {
        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ MessageSid: 'SM123' }).toString(),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
        expect(whatsappDeliveryStatusService.updateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('returns empty xml when rate limited', async () => {
        vi.mocked(rateLimiter.limit).mockResolvedValue({ allowed: false } as any);
        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ MessageSid: 'SM123', MessageStatus: 'delivered' }).toString(),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
        expect(whatsappDeliveryStatusService.updateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('delegates a valid callback to the delivery status service', async () => {
        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                MessageSid: 'SM123',
                MessageStatus: 'failed',
                ErrorCode: '30003',
                ErrorMessage: 'Blocked destination',
            }).toString(),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(whatsappDeliveryStatusService.updateDeliveryStatus).toHaveBeenCalledWith(expect.objectContaining({
            messageSid: 'SM123',
            providerStatus: 'failed',
            providerErrorCode: '30003',
            providerErrorMessage: 'Blocked destination',
        }));
    });

    it('returns 200 when the sid does not exist', async () => {
        vi.mocked(whatsappDeliveryStatusService.updateDeliveryStatus).mockResolvedValue({
            outcome: 'message_not_found',
            providerStatus: 'delivered',
            normalizedStatus: 'delivered',
        } as any);

        const req = new NextRequest('http://localhost:3000/api/whatsapp/status', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ MessageSid: 'SM404', MessageStatus: 'delivered' }).toString(),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
    });
});
