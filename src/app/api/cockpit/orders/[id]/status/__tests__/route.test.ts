import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { orderService } from '@/modules/atendimento/order.service';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/order.service', () => ({
    orderService: {
        updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Cockpit Order Status Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-order-status',
            session: { tenantId: 'tenant-1', sub: 'op-1', role: 'admin' },
        } as any);
    });

    it('returns 400 for an invalid JSON body', async () => {
        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: '{',
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('Invalid JSON body');
    });

    it('returns 404 when the order does not exist', async () => {
        vi.mocked(orderService.updateOrderStatus).mockRejectedValueOnce(new Error('Order not found'));

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-missing/status', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'CONFIRMED' }),
        });
        const context = { params: Promise.resolve({ id: 'order-missing' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toBe('Order not found');
    });

    it('returns 409 when the requested transition conflicts with the order state', async () => {
        vi.mocked(orderService.updateOrderStatus).mockRejectedValueOnce(
            new Error('Cannot regress order status from SHIPPED to PROCESSING')
        );

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'PROCESSING' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.error.code).toBe('CONFLICT');
        expect(body.error.message).toBe('Cannot regress order status from SHIPPED to PROCESSING');
    });

    it('returns 400 when the requested order status is invalid', async () => {
        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'INVALID' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('returns 200 when confirmation is processed idempotently', async () => {
        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/status', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'CONFIRMED' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(orderService.updateOrderStatus).toHaveBeenCalledWith('tenant-1', 'order-1', 'CONFIRMED');
    });
});
