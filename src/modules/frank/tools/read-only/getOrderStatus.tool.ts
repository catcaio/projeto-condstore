import { getOrderAggregate } from '@/modules/pedidos/order.repository';
import { getShipmentsForOrder } from '@/modules/freight/shipment-linkage.repository';
import { executeFrankTool } from '../tool-guard';
import { selectLatestShipment, toShipmentSummary, type ShipmentSummary } from './shared';

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
