import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { shipmentService } from '@/modules/logistics/server';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/logistics/server', () => ({
    shipmentService: {
        getShipmentByOrder: vi.fn(),
        updateShipmentStatus: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Cockpit Shipment Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-shipment-status',
            session: { tenantId: 'tenant-1', sub: 'op-1', role: 'admin' },
        } as any);
    });

    it('returns 400 for an invalid JSON body', async () => {
        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/shipment', {
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

    it('returns 404 when the order has no shipment to patch', async () => {
        vi.mocked(shipmentService.getShipmentByOrder).mockResolvedValueOnce(undefined);

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/shipment', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'IN_TRANSIT' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toBe('Shipment not found for this order');
    });

    it('returns 409 when the shipment transition conflicts with the current state', async () => {
        vi.mocked(shipmentService.getShipmentByOrder).mockResolvedValueOnce({ id: 'shipment-1' } as any);
        vi.mocked(shipmentService.updateShipmentStatus).mockRejectedValueOnce(
            new Error('Cannot change status of a DELIVERED shipment')
        );

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/shipment', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'IN_TRANSIT' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.error.code).toBe('CONFLICT');
        expect(body.error.message).toBe('Cannot change status of a DELIVERED shipment');
    });

    it('returns 404 when the provided shipmentId does not belong to the order', async () => {
        vi.mocked(shipmentService.getShipmentByOrder).mockResolvedValueOnce({ id: 'shipment-1' } as any);

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/shipment', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ shipmentId: 'shipment-other', status: 'IN_TRANSIT' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toBe('Shipment not found for this order');
        expect(shipmentService.updateShipmentStatus).not.toHaveBeenCalled();
    });

    it('returns 200 when a shipment already opened for the order is updated', async () => {
        vi.mocked(shipmentService.getShipmentByOrder).mockResolvedValueOnce({ id: 'shipment-open' } as any);

        const request = new Request('http://localhost:3000/api/cockpit/orders/order-1/shipment', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'IN_TRANSIT' }),
        });
        const context = { params: Promise.resolve({ id: 'order-1' }) };

        const response = await PATCH(request as any, context);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(shipmentService.updateShipmentStatus).toHaveBeenCalledWith(
            'tenant-1',
            'shipment-open',
            'IN_TRANSIT',
            undefined,
            undefined
        );
    });
});
