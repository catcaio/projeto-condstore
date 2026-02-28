import { getDb } from '../../infra/db';
import {
    dispatchTechnicians,
    dispatchDeliveryOrders,
    dispatchDeliveryRoutes,
    dispatchDeliveryRouteStops,
    dispatchDeliveryEvents
} from '../../drizzle/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../infra/logger';

export class DispatchService {

    /**
     * Stub for importing orders from a local source.
     * In MVP, it just creates mock orders if none exist for today to simulate the process.
     */
    async importOrders(tenantId: string): Promise<number> {
        const db = await getDb();

        // MVP: Check if any pending orders exist today
        const existing = await db.select({ id: dispatchDeliveryOrders.id })
            .from(dispatchDeliveryOrders)
            .where(
                and(
                    eq(dispatchDeliveryOrders.tenantId, tenantId),
                    eq(dispatchDeliveryOrders.status, 'pending')
                )
            )
            .limit(1);

        if (existing.length > 0) return 0; // Already have pending orders

        // Create 3 mock orders
        const mocks = [
            { customerName: 'João Silva', addressLine: 'Rua das Flores, 123', city: 'São Paulo', zipCode: '01000-000' },
            { customerName: 'Maria Cunha', addressLine: 'Av Paulista, 1000', city: 'São Paulo', zipCode: '01310-100' },
            { customerName: 'Carlos Beta', addressLine: 'Rua Augusta, 400', city: 'São Paulo', zipCode: '01305-000' }
        ];

        let count = 0;
        for (const m of mocks) {
            const orderId = crypto.randomUUID();
            await db.insert(dispatchDeliveryOrders).values({
                id: orderId,
                tenantId,
                orderRef: `MOCK-${Date.now()}-${count}`,
                customerName: m.customerName,
                addressLine: m.addressLine,
                city: m.city,
                trackingToken: crypto.randomBytes(16).toString('hex'),
                status: 'pending'
            });
            count++;

            // Log creation event
            await db.insert(dispatchDeliveryEvents).values({
                id: crypto.randomUUID(),
                tenantId,
                orderId,
                status: 'created',
                description: 'Imported local mock order'
            });
        }
        return count;
    }

    /**
     * Generate routes (MVP: Group by city/neighborhood generic, assign all pending to one active tech)
     */
    async generateRoutes(tenantId: string, targetDate: string): Promise<string[]> {
        const db = await getDb();

        // Get active technicians
        const techs = await db.select()
            .from(dispatchTechnicians)
            .where(and(eq(dispatchTechnicians.tenantId, tenantId), eq(dispatchTechnicians.status, 'active')));

        if (techs.length === 0) {
            // MVP: auto create a technician if none exist
            const newTechId = crypto.randomUUID();
            await db.insert(dispatchTechnicians).values({
                id: newTechId,
                tenantId,
                name: 'Técnico Parceiro Padrão',
                phone: '11999999999'
            });
            techs.push({
                id: newTechId, tenantId, name: 'Técnico Parceiro Padrão', phone: '11999999999', status: 'active', createdAt: new Date(), updatedAt: new Date()
            });
        }

        // Get pending orders
        const pending = await db.select()
            .from(dispatchDeliveryOrders)
            .where(and(eq(dispatchDeliveryOrders.tenantId, tenantId), eq(dispatchDeliveryOrders.status, 'pending')));

        if (pending.length === 0) return []; // Nothing to route

        const generatedRouteIds: string[] = [];
        const techId = techs[0].id; // MVP: Assign all to first tech

        // Create Route
        const routeId = crypto.randomUUID();
        await db.insert(dispatchDeliveryRoutes).values({
            id: routeId,
            tenantId,
            technicianId: techId,
            date: new Date(targetDate), // Requires YYYY-MM-DD
            status: 'pending'
        });

        // Add Stops
        let seq = 1;
        for (const order of pending) {
            // stop
            await db.insert(dispatchDeliveryRouteStops).values({
                id: crypto.randomUUID(),
                tenantId,
                routeId,
                orderId: order.id,
                sequenceIndex: seq++
            });

            // update order
            await db.update(dispatchDeliveryOrders)
                .set({ status: 'routed' })
                .where(eq(dispatchDeliveryOrders.id, order.id));

            // event log
            await db.insert(dispatchDeliveryEvents).values({
                id: crypto.randomUUID(),
                tenantId,
                orderId: order.id,
                status: 'routed',
                description: `Routed to technician ${techs[0].name}`
            });
        }

        generatedRouteIds.push(routeId);
        return generatedRouteIds;
    }

    /**
     * Update sequence status during the execution.
     */
    async updateStopStatus(tenantId: string, routeId: string, stopId: string, orderId: string, status: 'completed' | 'failed', description?: string) {
        const db = await getDb();

        await db.update(dispatchDeliveryRouteStops)
            .set({
                status,
                completedAt: status === 'completed' ? new Date() : null
            })
            .where(and(eq(dispatchDeliveryRouteStops.tenantId, tenantId), eq(dispatchDeliveryRouteStops.id, stopId)));

        const newOrderStatus = status === 'completed' ? 'delivered' : 'failed';

        await db.update(dispatchDeliveryOrders)
            .set({ status: newOrderStatus })
            .where(eq(dispatchDeliveryOrders.id, orderId));

        await db.insert(dispatchDeliveryEvents).values({
            id: crypto.randomUUID(),
            tenantId,
            orderId,
            status: newOrderStatus,
            description: description || `Status updated to ${newOrderStatus} by technician`
        });

        // Check if route is fully completed
        const remaining = await db.select({ id: dispatchDeliveryRouteStops.id })
            .from(dispatchDeliveryRouteStops)
            .where(and(eq(dispatchDeliveryRouteStops.routeId, routeId), eq(dispatchDeliveryRouteStops.status, 'pending')));

        if (remaining.length === 0) {
            await db.update(dispatchDeliveryRoutes)
                .set({ status: 'completed' })
                .where(eq(dispatchDeliveryRoutes.id, routeId));
        } else {
            // If it's the first step being marked, mark route as in_progress
            await db.update(dispatchDeliveryRoutes)
                .set({ status: 'in_progress' })
                .where(and(
                    eq(dispatchDeliveryRoutes.id, routeId),
                    eq(dispatchDeliveryRoutes.status, 'pending')
                ));
        }

        return newOrderStatus;
    }
}

export const dispatchService = new DispatchService();
