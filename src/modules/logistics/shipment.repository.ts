import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/infra/db';
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
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.id, shipmentId)))
            .limit(1);
        return shipment;
    },

    async findShipmentByOrderId(tenantId: string, orderId: string): Promise<ShipmentRecord | undefined> {
        const db = await getDb();
        const [shipment] = await db.select()
            .from(shipments)
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.orderId, orderId)))
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
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.id, shipmentId)));
    },

    async listShipments(tenantId: string, filter: ShipmentListFilter): Promise<ShipmentRecord[]> {
        const db = await getDb();
        const conditions = [eq(shipments.tenantId, tenantId)];
        
        if (filter.status) {
            conditions.push(eq(shipments.status, filter.status));
        }

        return db.select()
            .from(shipments)
            .where(and(...conditions))
            .orderBy(desc(shipments.createdAt))
            .limit(Math.min(filter.limit || 50, 100))
            .offset(filter.offset || 0);
    }
};
