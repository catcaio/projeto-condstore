import { db } from '@/db/client';
import { freightShipments } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { softDeletePatch, withNotDeleted, withTenantIdNotDeleted, withTenantNotDeleted } from '@/infra/db';

/**
 * Explicitly links an existing shipment to an Order.
 * Closes the operational loop (Quote -> Order -> Shipment).
 */
export async function linkShipmentToOrder(tenantId: string, shipmentId: string, orderId: string) {
    await db.update(freightShipments)
        .set({ orderId })
        .where(withTenantIdNotDeleted(freightShipments, tenantId, shipmentId));
}

/**
 * Retrieves all shipments for a given order.
 */
export async function getShipmentsForOrder(tenantId: string, orderId: string) {
    return await db
        .select()
        .from(freightShipments)
        .where(withTenantNotDeleted(freightShipments, tenantId, eq(freightShipments.orderId, orderId)))
        .orderBy(desc(freightShipments.updatedAt), desc(freightShipments.createdAt));
}

export async function getShipmentById(tenantId: string, shipmentId: string) {
    const shipments = await db
        .select()
        .from(freightShipments)
        .where(withTenantIdNotDeleted(freightShipments, tenantId, shipmentId))
        .limit(1);

    return shipments[0] ?? null;
}

export async function listFreightShipments(tenantId: string, limit = 100) {
    return db
        .select()
        .from(freightShipments)
        .where(withTenantNotDeleted(freightShipments, tenantId))
        .orderBy(desc(freightShipments.createdAt))
        .limit(Math.min(limit, 100));
}

export async function findFreightShipmentByExternalShipmentId(
    externalShipmentId: string,
    trackingCode?: string | null,
) {
    const [shipment] = await db
        .select()
        .from(freightShipments)
        .where(
            withNotDeleted(
                freightShipments,
                eq(freightShipments.externalShipmentId, externalShipmentId),
                trackingCode ? eq(freightShipments.trackingCode, trackingCode) : undefined,
            ),
        )
        .limit(1);

    return shipment ?? null;
}

export async function updateFreightShipmentStatus(tenantId: string, shipmentId: string, status: string) {
    await db.update(freightShipments)
        .set({ status, updatedAt: new Date() })
        .where(withTenantIdNotDeleted(freightShipments, tenantId, shipmentId));
}

export async function softDeleteFreightShipment(tenantId: string, shipmentId: string) {
    await db.update(freightShipments)
        .set({ ...softDeletePatch(), updatedAt: new Date() })
        .where(withTenantIdNotDeleted(freightShipments, tenantId, shipmentId));
}
