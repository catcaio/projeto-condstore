import { db } from '@/db/client';
import { and, eq, desc, like } from 'drizzle-orm';
import { orders, orderItems, orderStatusHistory, customers, organizations, freightShipments } from '@/drizzle/schema';
import { activeJoin, withTenantIdNotDeleted, withTenantNotDeleted } from '@/infra/db';

/**
 * Retrieves the complete order aggregate including items and status history.
 */
export async function getOrderAggregate(tenantId: string, orderId: string) {
    const orderRecs = await db
        .select({
            order: orders,
            customer: customers,
            organization: organizations,
            shipment: freightShipments,
        })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .innerJoin(organizations, eq(customers.organizationId, organizations.id))
        .leftJoin(freightShipments, activeJoin(freightShipments, eq(freightShipments.orderId, orders.id)))
        .where(withTenantIdNotDeleted(orders, tenantId, orderId))
        .limit(1);

    if (orderRecs.length === 0) {
        return null;
    }

    const { order, customer, organization, shipment } = orderRecs[0];

    const items = await db
        .select()
        .from(orderItems)
        .where(
            and(
                eq(orderItems.tenantId, tenantId),
                eq(orderItems.orderId, orderId),
            ),
        );

    const history = await db
        .select()
        .from(orderStatusHistory)
        .where(
            and(
                eq(orderStatusHistory.tenantId, tenantId),
                eq(orderStatusHistory.orderId, orderId),
            ),
        )
        .orderBy(desc(orderStatusHistory.createdAt));

    return {
        order,
        items,
        history,
        customer,
        organization,
        shipment,
    };
}

export async function getRecentOrdersForCustomer(
    tenantId: string,
    customerId: string,
    limit = 5,
) {
    return db
        .select()
        .from(orders)
        .where(withTenantNotDeleted(orders, tenantId, eq(orders.customerId, customerId)))
        .orderBy(desc(orders.createdAt))
        .limit(limit);
}

/**
 * Finds an order and its associated shipment by matching the order ID prefix.
 * Useful for resolving conversational references like "pedido 25860".
 */
export async function findOrderWithShipmentByPrefix(
    tenantId: string,
    orderIdPrefix: string,
    customerId?: string
) {
    const records = await db
        .select({
            orderId: orders.id,
            shipmentId: freightShipments.id,
        })
        .from(orders)
        .leftJoin(freightShipments, activeJoin(freightShipments, eq(freightShipments.orderId, orders.id)))
        .where(
            withTenantNotDeleted(
                orders,
                tenantId,
                like(orders.id, `${orderIdPrefix}%`),
                customerId ? eq(orders.customerId, customerId) : undefined,
            ),
        )
        .limit(1);

    if (records.length === 0) {
        return null;
    }

    return records[0];
}
