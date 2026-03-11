import { db } from '@/db/client';
import { eq, and, desc } from 'drizzle-orm';
import { orders, orderItems, orderStatusHistory, customers, organizations, freightShipments } from '@/drizzle/schema';

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
        .leftJoin(freightShipments, eq(freightShipments.orderId, orders.id))
        .where(
            and(
                eq(orders.tenantId, tenantId),
                eq(orders.id, orderId)
            )
        )
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
                eq(orderItems.orderId, orderId)
            )
        );

    const history = await db
        .select()
        .from(orderStatusHistory)
        .where(
            and(
                eq(orderStatusHistory.tenantId, tenantId),
                eq(orderStatusHistory.orderId, orderId)
            )
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
