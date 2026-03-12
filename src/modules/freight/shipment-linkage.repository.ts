import { db } from '@/db/client';
import { freightShipments } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Explicitly links an existing shipment to an Order.
 * Closes the operational loop (Quote -> Order -> Shipment).
 */
export async function linkShipmentToOrder(tenantId: string, shipmentId: string, orderId: string) {
    await db.update(freightShipments)
        .set({ orderId })
        .where(
            and(
                eq(freightShipments.tenantId, tenantId),
                eq(freightShipments.id, shipmentId)
            )
        );
}

/**
 * Retrieves all shipments for a given order.
 */
export async function getShipmentsForOrder(tenantId: string, orderId: string) {
    return await db
        .select()
        .from(freightShipments)
        .where(
            and(
                eq(freightShipments.tenantId, tenantId),
                eq(freightShipments.orderId, orderId)
            )
        )
        .orderBy(desc(freightShipments.updatedAt), desc(freightShipments.createdAt));
}

export async function getShipmentById(tenantId: string, shipmentId: string) {
    const shipments = await db
        .select()
        .from(freightShipments)
        .where(
            and(
                eq(freightShipments.tenantId, tenantId),
                eq(freightShipments.id, shipmentId),
            ),
        )
        .limit(1);

    return shipments[0] ?? null;
}
