import { z } from 'zod';
import { getOrderAggregate } from '@/modules/pedidos/server';
import { getShipmentsForOrder } from '@/modules/freight/server';
import { executeFrankTool } from '../tool-guard';
import { selectLatestShipment, toShipmentSummary, type ShipmentSummary } from './shared';
import { FrankToolContract } from '../frank-tool.contract';
import { frankToolRegistry } from '../frank-tool.registry';

type OrderAggregate = NonNullable<Awaited<ReturnType<typeof getOrderAggregate>>>;

export interface OrderStatusHistoryEntry {
    previousStatus: string | null;
    status: string;
    reason: string | null;
    changedBy: string | null;
    createdAt: Date;
}

export interface OrderStatusResult {
    order: OrderAggregate['order'];
    currentStatus: string;
    statusHistory: OrderStatusHistoryEntry[];
    linkedShipment: ShipmentSummary | null;
}

export interface GetOrderStatusParams {
    tenantId: string;
    orderId: string;
}

export const getOrderStatusInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    orderId: z.string().min(1, 'orderId is required'),
});

export const getOrderStatusOutputSchema = z.object({
    order: z.any(),
    currentStatus: z.string(),
    statusHistory: z.array(z.object({
        previousStatus: z.string().nullable(),
        status: z.string(),
        reason: z.string().nullable(),
        changedBy: z.string().nullable(),
        createdAt: z.any(),
    })),
    linkedShipment: z.any().nullable(),
}).nullable();

export const getOrderStatusContract: FrankToolContract<GetOrderStatusParams, OrderStatusResult | null> = {
    name: 'get_order_status',
    description: 'Fetches order details, status history, and linked shipment status.',
    inputSchema: getOrderStatusInputSchema,
    outputSchema: getOrderStatusOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return getOrderStatusTool(input);
    },
};

frankToolRegistry.registerTool(getOrderStatusContract);

export async function getOrderStatusTool(
    params: GetOrderStatusParams,
): Promise<OrderStatusResult | null> {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'get_order_status',
        access: 'read_only',
        run: async () => {
            const aggregate = await getOrderAggregate(params.tenantId, params.orderId);

            if (!aggregate) {
                return null;
            }

            const shipments = await getShipmentsForOrder(params.tenantId, params.orderId);
            const linkedShipment = toShipmentSummary(
                selectLatestShipment(shipments) ?? (aggregate.shipment ?? null),
            );

            const statusHistory = aggregate.history.map((entry) => ({
                previousStatus: entry.previousStatus,
                status: entry.newStatus,
                reason: entry.reason,
                changedBy: entry.changedBy,
                createdAt: entry.createdAt,
            }));

            return {
                order: aggregate.order,
                currentStatus: statusHistory[0]?.status ?? aggregate.order.status,
                statusHistory,
                linkedShipment,
            };
        },
    });
}
