import { beforeEach, describe, expect, it, vi } from 'vitest';

const { simulateFreightMock, createOrderMock, getOrderStatusMock } = vi.hoisted(() => ({
    simulateFreightMock: vi.fn(),
    createOrderMock: vi.fn(),
    getOrderStatusMock: vi.fn(),
}));

vi.mock('@/modules/freight/freight.service', () => ({
    freightService: {
        simulateFreight: simulateFreightMock,
    },
}));

vi.mock('./create-order-from-quote.tool', () => ({
    createOrderFromQuoteTool: createOrderMock,
}));

vi.mock('./read-only/getOrderStatus.tool', () => ({
    getOrderStatusTool: getOrderStatusMock,
}));

vi.mock('./read-only/getShipmentStatus.tool', () => ({
    getShipmentStatusTool: vi.fn(),
}));

import { runTool } from './tool-runner';

describe('runTool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('executes valid low-risk tools and normalizes response', async () => {
        simulateFreightMock.mockResolvedValueOnce({ carrier: 'x', price: 10, deliveryDays: 2 });

        const result = await runTool(
            'freight_calculation',
            {
                tenantId: 'tenant-1',
                productId: 'prod-1',
                quantity: 1,
                destinationZip: '01001000',
            },
            {
                tenantId: 'tenant-1',
                requestId: 'req-1',
            },
        );

        expect(result.ok).toBe(true);
        expect(result.data).toEqual({ carrier: 'x', price: 10, deliveryDays: 2 });
        expect(result.error).toBeNull();
    });

    it('blocks high-risk order creation tool without policy precondition', async () => {
        const result = await runTool(
            'create_order_from_quote',
            {
                tenantId: 'tenant-1',
                simulationId: 'sim-1',
                customerId: 'cust-1',
                organizationId: 'org-1',
                items: [{ name: 'Item', quantity: 1, unitPrice: 10 }],
            },
            {
                tenantId: 'tenant-1',
                requestId: 'req-2',
            },
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('POLICY_BLOCKED');
        expect(createOrderMock).not.toHaveBeenCalled();
    });


    it('blocks high-risk quote creation tool without policy precondition', async () => {
        const result = await runTool(
            'create_quote',
            {
                tenantId: 'tenant-1',
                productId: 'prod-1',
                quantity: 1,
                destinationZip: '01001000',
            },
            {
                tenantId: 'tenant-1',
                requestId: 'req-quote-blocked',
            },
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('POLICY_BLOCKED');
        expect(simulateFreightMock).not.toHaveBeenCalled();
    });

    it('allows high-risk tools when explicit precondition is provided', async () => {
        simulateFreightMock.mockResolvedValueOnce({ carrier: 'x', price: 11, deliveryDays: 3 });

        const result = await runTool(
            'create_quote',
            {
                tenantId: 'tenant-1',
                productId: 'prod-1',
                quantity: 1,
                destinationZip: '01001000',
            },
            {
                tenantId: 'tenant-1',
                requestId: 'req-quote-allowed',
                allowHighRisk: true,
            },
        );

        expect(result.ok).toBe(true);
        expect(result.error).toBeNull();
        expect(result.data).toEqual({ carrier: 'x', price: 11, deliveryDays: 3 });
    });

    it('returns structured execution error on tool failure', async () => {
        getOrderStatusMock.mockRejectedValueOnce(new Error('boom'));

        const result = await runTool(
            'get_order_status',
            {
                tenantId: 'tenant-1',
                orderId: 'ord-1',
            },
            {
                tenantId: 'tenant-1',
                requestId: 'req-3',
            },
        );

        expect(result.ok).toBe(false);
        expect(result.error).toEqual({
            code: 'TOOL_EXECUTION_FAILED',
            message: 'boom',
        });
        expect(result.data).toBeNull();
    });
});
