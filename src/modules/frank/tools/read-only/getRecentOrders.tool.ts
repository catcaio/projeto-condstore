import { getRecentOrdersForCustomer } from '@/modules/orders/server';
import { getShipmentsForOrder } from '@/modules/shipments';
import { executeFrankTool } from '../tool-guard';
import { clampSupportLimit, selectLatestShipment, toShipmentSummary, type ShipmentSummary } from './shared';

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
