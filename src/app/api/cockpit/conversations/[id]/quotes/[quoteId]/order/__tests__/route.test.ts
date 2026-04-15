import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { orderService } from '@/modules/atendimento/order.service';
import { OrderBillingRequiredError } from '@/modules/billing/guards/assertTenantCanOperateOrders';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/order.service', () => ({
    orderService: {
        createOrderFromQuote: vi.fn(),
    }
}));

vi.mock('@/modules/atendimento/freight-quote.service', () => ({
    freightQuoteService: {
        getQuoteById: vi.fn(),
    }
}));

describe('Accept Quote -> Order Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(orderService.createOrderFromQuote).mockResolvedValue({ id: 'new-order' } as any);
        vi.mocked(freightQuoteService.getQuoteById).mockResolvedValue({ id: 'quote1', conversationId: 'conv1', status: 'ACCEPTED' } as any);
    });

    it('resolves operatorId purely using auth.session.sub (working with Frank loop)', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();
        
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);

        expect(orderService.createOrderFromQuote).toHaveBeenCalledWith(
            't1',
            'conv1',
            'quote1',
            'op-123'
        );
    });

    it('returns 402 when billing gate blocks order creation', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);
        
        vi.mocked(orderService.createOrderFromQuote).mockRejectedValueOnce(
            new OrderBillingRequiredError('t1', 'past_due'),
        );

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(402);
        expect(body).toEqual({
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                requestId: expect.any(String),
                message: "Tenant subscription status 'past_due' does not allow order creation or confirmation.",
            },
        });
    });

    it('blocks order creation when policy classifies action as HIGH_RISK without accepted quote', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);
        vi.mocked(freightQuoteService.getQuoteById).mockResolvedValue({ id: 'quote1', conversationId: 'conv1', status: 'SENT' } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.ok).toBe(false);
        expect(body.error.message).toContain('cotacao precisa estar aprovada');
        expect(orderService.createOrderFromQuote).not.toHaveBeenCalled();
    });

    it('returns 400 when quote belongs to another conversation', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);
        vi.mocked(freightQuoteService.getQuoteById).mockResolvedValue({ id: 'quote1', conversationId: 'conv-else' } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.ok).toBe(false);
        expect(body.error.message).toBe('Quote does not belong to this conversation');
        expect(orderService.createOrderFromQuote).not.toHaveBeenCalled();
    });

    it('returns 400 for approval validation errors from service', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);
        vi.mocked(orderService.createOrderFromQuote).mockRejectedValueOnce(
            new Error('A cotacao precisa estar aprovada antes de criar o pedido.')
        );

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.ok).toBe(false);
        expect(body.error.message).toBe('A cotacao precisa estar aprovada antes de criar o pedido.');
    });

    it('returns 409 when quote conversion lock is busy', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);
        vi.mocked(orderService.createOrderFromQuote).mockRejectedValueOnce(
            new Error('A cotação está sendo processada no momento. Por favor aguarde um instante.')
        );

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { 
            method: 'POST',
            body: JSON.stringify({ humanApprovalToken: 'test-token' })
        });
        const context = { params: Promise.resolve({ id: 'conv1', quoteId: 'quote1' }) };

        const res = await POST(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body.ok).toBe(false);
        expect(body.error.message).toContain('A cotação está sendo processada');
    });
});
