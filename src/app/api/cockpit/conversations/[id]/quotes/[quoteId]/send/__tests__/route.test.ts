import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { twilioProvider } from '@/providers/twilio.provider';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/freight-quote.service', () => ({
    freightQuoteService: {
        getQuoteById: vi.fn(),
        sendQuote: vi.fn(),
    }
}));

vi.mock('@/modules/atendimento/conversation.service', () => ({
    conversationService: {
        getConversationById: vi.fn(),
        processOutboundMessage: vi.fn(),
        changeConversationStage: vi.fn(),
    }
}));

vi.mock('@/providers/twilio.provider', () => ({
    twilioProvider: {
        sendMessage: vi.fn(),
    }
}));

vi.mock('@/infra/pii/crypto', () => ({
    decryptString: vi.fn(() => '+5511999999999'),
}));

vi.mock('@/domine/domine-intake.service', () => ({
    domineIntakeService: {
        publish: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Send Quote Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 and avoids WhatsApp send when quote is already terminal', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'tenant-1', userId: 'op-1', role: 'admin' },
        } as any);
        vi.mocked(conversationService.getConversationById).mockResolvedValue({
            id: 'conv-1',
            phoneEncrypted: 'enc',
            customerId: 'cust-1',
        } as any);
        vi.mocked(freightQuoteService.getQuoteById).mockResolvedValue({
            id: 'quote-1',
            conversationId: 'conv-1',
            status: 'CONVERTED',
        } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv-1/quotes/quote-1/send', { method: 'POST' });
        const context = { params: Promise.resolve({ id: 'conv-1', quoteId: 'quote-1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.message).toBe('Cannot send quote in CONVERTED status');
        expect(twilioProvider.sendMessage).not.toHaveBeenCalled();
        expect(freightQuoteService.sendQuote).not.toHaveBeenCalled();
    });
});
