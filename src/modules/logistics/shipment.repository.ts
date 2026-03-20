import { eq, desc } from 'drizzle-orm';
import { getDb, softDeletePatch, withTenantIdNotDeleted, withTenantNotDeleted } from '@/infra/db';
import { shipments, type ShipmentRecord } from '@/drizzle/schema';

export interface ShipmentListFilter {
    status?: string;
    limit?: number;
    offset?: number;
}

export const shipmentRepository = {
    async findShipmentById(tenantId: string, shipmentId: string): Promise<ShipmentRecord | undefined> {
        const db = await getDb();
        const [shipment] = await db.select()
            .from(shipments)
            .where(withTenantIdNotDeleted(shipments, tenantId, shipmentId))
            .limit(1);
        return shipment;
    },

    async findShipmentByOrderId(tenantId: string, orderId: string): Promise<ShipmentRecord | undefined> {
        const db = await getDb();
        const [shipment] = await db.select()
            .from(shipments)
            .where(withTenantNotDeleted(shipments, tenantId, eq(shipments.orderId, orderId)))
            .limit(1);
        return shipment;
    },

    async insertShipment(data: {
        id: string;
        tenantId: string;
        orderId: string;
        carrier: string;
        service?: string;
        estimatedDelivery?: number;
        status: string;
    }): Promise<void> {
        const db = await getDb();
        await db.insert(shipments).values(data);
    },

    async updateShipment(
        tenantId: string,
        shipmentId: string,
        data: { status?: string; trackingCode?: string; trackingUrl?: string; }
    ): Promise<void> {
        const db = await getDb();
        await db.update(shipments)
            .set(data)
            .where(withTenantIdNotDeleted(shipments, tenantId, shipmentId));
    },

    async softDeleteShipment(tenantId: string, shipmentId: string): Promise<void> {
        const db = await getDb();
        await db.update(shipments)
            .set({ ...softDeletePatch(), updatedAt: new Date() })
            .where(withTenantIdNotDeleted(shipments, tenantId, shipmentId));
    },

    async listShipments(tenantId: string, filter: ShipmentListFilter): Promise<ShipmentRecord[]> {
        const db = await getDb();
        return db.select()
            .from(shipments)
            .where(withTenantNotDeleted(shipments, tenantId, filter.status ? eq(shipments.status, filter.status) : undefined))
            .orderBy(desc(shipments.createdAt))
            .limit(Math.min(filter.limit || 50, 100))
            .offset(filter.offset || 0);
    }
};
