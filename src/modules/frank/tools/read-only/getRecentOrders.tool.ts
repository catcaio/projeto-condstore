import { z } from 'zod';
import { getRecentOrdersForCustomer } from '@/modules/pedidos/server';
import { getShipmentsForOrder } from '@/modules/freight/server';
import { executeFrankTool } from '../tool-guard';
import { clampSupportLimit, selectLatestShipment, toShipmentSummary, type ShipmentSummary } from './shared';
import { FrankToolContract } from '../frank-tool.contract';
import { frankToolRegistry } from '../frank-tool.registry';

export interface RecentOrderSummary {
    orderId: string;
    currentStatus: string;
    createdAt: Date;
    linkedShipment: ShipmentSummary | null;
}

export interface GetRecentOrdersParams {
    tenantId: string;
    customerId: string;
    limit?: number;
}

export const getRecentOrdersInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    customerId: z.string().min(1, 'customerId is required'),
    limit: z.number().int().positive().optional(),
});

export const getRecentOrdersOutputSchema = z.array(
    z.object({
        orderId: z.string(),
        currentStatus: z.string(),
        createdAt: z.any(),
        linkedShipment: z.any().nullable(),
    })
);

export const getRecentOrdersContract: FrankToolContract<GetRecentOrdersParams, RecentOrderSummary[]> = {
    name: 'get_recent_orders',
    description: 'Retrieves recent orders for a given customer with linked shipments.',
    inputSchema: getRecentOrdersInputSchema,
    outputSchema: getRecentOrdersOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return getRecentOrdersTool(input);
    },
};

frankToolRegistry.registerTool(getRecentOrdersContract);

export async function getRecentOrdersTool(
    params: GetRecentOrdersParams,
): Promise<RecentOrderSummary[]> {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'get_recent_orders',
        access: 'read_only',
        run: async () => {
            const limit = clampSupportLimit(params.limit);
            const orders = await getRecentOrdersForCustomer(
                params.tenantId,
                params.customerId,
                limit,
            );

            return Promise.all(
                orders.map(async (order) => {
                    const shipments = await getShipmentsForOrder(params.tenantId, order.id);

                    return {
                        orderId: order.id,
                        currentStatus: order.status,
                        createdAt: order.createdAt,
                        linkedShipment: toShipmentSummary(selectLatestShipment(shipments)),
                    };
                }),
            );
        },
    });
}
