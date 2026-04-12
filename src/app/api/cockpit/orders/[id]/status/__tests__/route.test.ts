import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { orderService } from '@/modules/atendimento/order.service';
import { OrderBillingRequiredError } from '@/modules/billing/guards/assertTenantCanOperateOrders';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/order.service', () => ({
    orderService: {
        updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Order Status Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates order status when billing gate passes', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', role: 'admin' },
        } as any);

        const req = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CONFIRMED' }),
            headers: { 'content-type': 'application/json' },
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const res = await PATCH(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ok: true });
        expect(orderService.updateOrderStatus).toHaveBeenCalledWith('t1', 'order-1', 'CONFIRMED');
    });

    it('returns 402 when billing gate blocks order confirmation', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 't1', role: 'admin' },
        } as any);
        vi.mocked(orderService.updateOrderStatus).mockRejectedValue(
            new OrderBillingRequiredError('t1', 'canceled'),
        );

        const req = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CONFIRMED' }),
            headers: { 'content-type': 'application/json' },
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const res = await PATCH(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(402);
        expect(body).toEqual({
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                requestId: expect.any(String),
                message: "Tenant subscription status 'canceled' does not allow order creation or confirmation.",
            },
        });
    });
});
