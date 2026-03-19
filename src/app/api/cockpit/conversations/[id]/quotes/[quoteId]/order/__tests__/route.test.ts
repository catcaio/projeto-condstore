import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { orderService } from '@/modules/atendimento/order.service';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/order.service', () => ({
    orderService: {
        createOrderFromQuote: vi.fn().mockResolvedValue({ id: 'new-order' }),
    }
}));

describe('Accept Quote -> Order Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolves operatorId purely using auth.session.sub (no legacy fallback to user.id)', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', sub: 'op-123', role: 'admin' },
        } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv1/quotes/quote1/order', { method: 'POST' });
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
});
