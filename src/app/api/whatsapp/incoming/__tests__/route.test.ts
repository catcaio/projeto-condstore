import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { verifyTwilioSignature } from '@/lib/security/webhook-verifier';
import { whatsappInboundOrchestrator } from '@/modules/atendimento/whatsapp-inbound-orchestrator.service';

vi.mock('@/lib/security/webhook-verifier', () => ({
    verifyTwilioSignature: vi.fn(),
}));

vi.mock('@/modules/atendimento/whatsapp-inbound-orchestrator.service', () => ({
    whatsappInboundOrchestrator: {
        process: vi.fn()
    }
}));

vi.mock('@/infra/repositories/tenant.repository', () => ({
    tenantRepository: {
        resolveTenantByTwilioNumber: vi.fn().mockResolvedValue({ id: 'tenant123' })
    }
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('req-123'),
    attachRequestIdHeader: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/providers/twilio.provider', () => ({
    twilioProvider: {
        generateTwiMLResponse: vi.fn((msg) => `<Response>${msg ? msg : ''}</Response>`),
        parseIncomingMessage: vi.fn((p) => ({ from: p.From, body: p.Body }))
    }
}));

describe('WhatsApp Inbound Route', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'production', APP_URL: 'http://localhost:3000' } as any;
    });

    it('should reject invalid content-type with empty 200', async () => {
        const req = new NextRequest('http://localhost:3000/api/whatsapp/incoming', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ MessageSid: '123' })
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
    });

    it('should reject missing MessageSid with empty 200', async () => {
        (verifyTwilioSignature as any).mockReturnValue(true);
        const req = new NextRequest('http://localhost:3000/api/whatsapp/incoming', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ From: 'whatsapp:+5511999999999' }).toString()
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
    });

    it('should enforce signature validation in production and return empty TwiML', async () => {
        (verifyTwilioSignature as any).mockReturnValue(false); // Invalid
        const body = new URLSearchParams({ From: 'whatsapp:+5511', To: 'whatsapp:+123', MessageSid: 'SM123' }).toString();
        const req = new NextRequest('http://localhost:3000/api/whatsapp/incoming', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': 'invalid' },
            body
        });
        
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
        expect(whatsappInboundOrchestrator.process).not.toHaveBeenCalled();
    });

    it('should call orchestrator and return 200 empty TwiML for ACK_ONLY policy', async () => {
        (verifyTwilioSignature as any).mockReturnValue(true);
        (whatsappInboundOrchestrator.process as any).mockResolvedValue({ type: 'ACK_ONLY' });

        const body = new URLSearchParams({ From: 'whatsapp:+5511999999999', To: 'whatsapp:+123', MessageSid: 'SM123', Body: 'Oi' }).toString();
        const req = new NextRequest('http://localhost:3000/api/whatsapp/incoming', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': 'valid' },
            body
        });
        
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('<Response></Response>');
        expect(whatsappInboundOrchestrator.process).toHaveBeenCalled();
    });
    
    it('should call orchestrator and return text response for AUTO_REPLY_ALLOWED policy', async () => {
        (verifyTwilioSignature as any).mockReturnValue(true);
        (whatsappInboundOrchestrator.process as any).mockResolvedValue({ type: 'AUTO_REPLY_ALLOWED', text: 'Hello World' });

        const body = new URLSearchParams({ From: 'whatsapp:+5511999999999', To: 'whatsapp:+123', MessageSid: 'SM123', Body: 'Oi' }).toString();
        const req = new NextRequest('http://localhost:3000/api/whatsapp/incoming', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': 'valid' },
            body
        });
        
        const res = await POST(req);
        expect(res.status).toBe(200);
        const xml = await res.text();
        expect(xml).toContain('<Response>');
        expect(xml).toContain('Hello World');
    });
});
