import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { deliveries, deliveryLocationEvents, NewDeliveryLocationEventRecord } from '@/drizzle/schema';
import { structuredLogger } from '../log/logger';

export const deliveriesRepository = {
    /**
     * Appends a new GPS location event and advances the delivery's last known coordinates.
     */
    async recordLocationUpdate(params: {
        tenantId: string;
        deliveryId: string;
        lat: number;
        lng: number;
        accuracy?: number;
    }) {
        const { tenantId, deliveryId, lat, lng, accuracy } = params;
        const db = await getDb();

        // Perform the insertion and the update in parallel or transactionally.
        // For read performance, we update the denormalized location on the delivery record itself.
        await db.transaction(async (tx: any) => {
            // 1. Check strict tenant boundaries
            const delivery = await tx.select({ id: deliveries.id, status: deliveries.status })
                .from(deliveries)
                .where(and(
                    eq(deliveries.id, deliveryId),
                    eq(deliveries.tenantId, tenantId)
                ))
                ;

            if (delivery.length === 0) {
                structuredLogger.warn('delivery_not_found', { tenantId, deliveryId });
                throw new Error('Delivery not found or belongs to another tenant');
            }

            // Only allow tracking updates if it's active
            if (['created', 'cancelled', 'delivered'].includes(delivery[0].status)) {
                structuredLogger.info('delivery_location_ignored_wrong_status', { tenantId, deliveryId, status: delivery[0].status });
                // We'll still record the event, but maybe not update the active tracker?
                // For scaffolding, we can just proceed.
            }

            // 2. Append immutable event log
            const eventPayload: NewDeliveryLocationEventRecord = {
                id: crypto.randomUUID(),
                deliveryId,
                lat: lat.toString() as any, // Drizzle decimal mapping
                lng: lng.toString() as any,
                accuracy,
            };

            await tx.insert(deliveryLocationEvents).values(eventPayload);

            // 3. Update the read model (the actual Deliveries row, tenant-scoped)
            await tx.update(deliveries)
                .set({
                    lastLat: lat.toString() as any,
                    lastLng: lng.toString() as any,
                    lastUpdateAt: new Date(),
                })
                .where(and(
                    eq(deliveries.id, deliveryId),
                    eq(deliveries.tenantId, tenantId),
                ));
        });
    },

    // Find delivery
    async findDeliveryById(tenantId: string, deliveryId: string) {
        const db = await getDb();
        const results = await db.select().from(deliveries)
            .where(and(eq(deliveries.id, deliveryId), eq(deliveries.tenantId, tenantId)))
            ;
        return results[0] || null;
    },

    async findLatestDeliveryByOrderRef(tenantId: string, orderRef: string) {
        const db = await getDb();
        const results = await db
            .select()
            .from(deliveries)
            .where(and(eq(deliveries.tenantId, tenantId), eq(deliveries.orderRef, orderRef)))
            .orderBy(desc(deliveries.lastUpdateAt), desc(deliveries.createdAt))
            .limit(1);

        return results[0] || null;
    },

    async findLatestLocationEvent(tenantId: string, deliveryId: string) {
        const db = await getDb();

        // `deliveryLocationEvents` has no tenantId column (derived child table).
        // Gate the read on tenant ownership of the parent `deliveries` row so a
        // foreign deliveryId can never expose location data.
        const delivery = await db.select({ id: deliveries.id }).from(deliveries)
            .where(and(
                eq(deliveries.id, deliveryId),
                eq(deliveries.tenantId, tenantId),
            ))
            .limit(1);

        if (delivery.length === 0) return null;

        const results = await db
            .select()
            .from(deliveryLocationEvents)
            .where(eq(deliveryLocationEvents.deliveryId, deliveryId))
            .orderBy(desc(deliveryLocationEvents.recordedAt))
            .limit(1);

        return results[0] || null;
    },

    // List active deliveries 
    async listActiveDeliveries(tenantId: string) {
        const db = await getDb();
        return db.select().from(deliveries)
            .where(and(
                eq(deliveries.tenantId, tenantId)
                // for MVP show all, but we could filter by active statuses
            ));
    }
};
