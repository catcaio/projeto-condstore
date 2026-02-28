import { getDb } from '../../infra/db';
import {
    dispatchTechnicians,
    dispatchDeliveryOrders,
    dispatchDeliveryRoutes,
    dispatchDeliveryRouteStops,
    dispatchDeliveryEvents,
    freightSimulationLogs
} from '../../drizzle/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../infra/logger';

export class DispatchService {

    /**
     * Import local orders from existing ERP/freight data.
     */
    async importOrders(tenantId: string): Promise<number> {
        const db = await getDb();

        // 1. Dedup: Check if any pending orders exist today
        const existing = await db.select({ id: dispatchDeliveryOrders.id })
            .from(dispatchDeliveryOrders)
            .where(
                and(
                    eq(dispatchDeliveryOrders.tenantId, tenantId),
                    eq(dispatchDeliveryOrders.status, 'pending')
                )
            )
            .limit(1);

        if (existing.length > 0) return 0; // Already have pending orders to process

        let ordersToCreate: any[] = [];

        // 2. Real Integration path > get recent local simulated freights acting as sales
        const recentRealLocalTasks = await db.select({
            id: freightSimulationLogs.id,
            uf: freightSimulationLogs.uf,
            cep: freightSimulationLogs.cepHash, // hashed cep, we just use it as ref for local logic
            createdAt: freightSimulationLogs.createdAt
        })
            .from(freightSimulationLogs)
            .where(
                and(
                    eq(freightSimulationLogs.tenantId, tenantId),
                    sql`${freightSimulationLogs.prazo} <= 2` // Assuming fast transit times means local local scope
                )
            )
            .orderBy(desc(freightSimulationLogs.createdAt))
            .limit(10);

        if (recentRealLocalTasks.length > 0) {
            ordersToCreate = recentRealLocalTasks.map(task => ({
                customerName: `Cliente Log ${task.id.slice(0, 5)}`,
                addressLine: `Endereço Referência CEPHash: ${task.cep}`,
                city: 'Capital/Região',
                state: task.uf,
                zipCode: '00000-000'
            }));
        } else if (process.env.DISPATCH_ALLOW_MOCK_IMPORT === 'true') {
            // 3. Fallback to mock ONLY if explicit feature flag allowed
            ordersToCreate = [
                { customerName: 'João Silva', addressLine: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01000-000' },
                { customerName: 'Maria Cunha', addressLine: 'Av Paulista, 1000', city: 'São Paulo', state: 'SP', zipCode: '01310-100' },
                { customerName: 'Carlos Beta', addressLine: 'Rua Augusta, 400', city: 'São Paulo', state: 'SP', zipCode: '01305-000' }
            ];
        } else {
            logger.info('No recent local tasks found to import and mock is disabled.', { tenantId });
            return 0;
        }

        let count = 0;
        for (const m of ordersToCreate) {
            const orderId = crypto.randomUUID();
            const tokenPlain = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 7); // Token valid for 7 days

            await db.insert(dispatchDeliveryOrders).values({
                id: orderId,
                tenantId,
                orderRef: `REF-${Date.now()}-${count}`,
                customerName: m.customerName,
                addressLine: m.addressLine,
                city: m.city,
                state: m.state,
                zipCode: m.zipCode,
                trackingTokenHash: tokenHash,
                trackingTokenExpiresAt: expiry,
                status: 'pending'
            });
            count++;

            await db.insert(dispatchDeliveryEvents).values({
                id: crypto.randomUUID(),
                tenantId,
                orderId,
                status: 'created',
                description: 'Imported local delivery request'
            });
        }
        return count;
    }

    /**
     * Generate routes (Aggregates available tasks for technicians)
     */
    async generateRoutes(tenantId: string, targetDate: string): Promise<string[]> {
        const db = await getDb();

        // MVP: Only route if technicians exist. We DO NOT auto-create anymore explicitly per user rule 6.
        const techs = await db.select()
            .from(dispatchTechnicians)
            .where(and(eq(dispatchTechnicians.tenantId, tenantId), eq(dispatchTechnicians.status, 'active')));

        if (techs.length === 0) {
            logger.warn('No active technicians found for tenant. Cannot generate routes.', { tenantId });
            return [];
        }

        const pending = await db.select()
            .from(dispatchDeliveryOrders)
            .where(and(eq(dispatchDeliveryOrders.tenantId, tenantId), eq(dispatchDeliveryOrders.status, 'pending')));

        if (pending.length === 0) return [];

        const generatedRouteIds: string[] = [];
        const techId = techs[0].id;

        // Create Route
        const routeId = crypto.randomUUID();
        await db.insert(dispatchDeliveryRoutes).values({
            id: routeId,
            tenantId,
            technicianId: techId,
            date: new Date(targetDate), // Requires YYYY-MM-DD format
            status: 'pending'
        });

        // Loop stops
        let seq = 1;
        for (const order of pending) {
            await db.insert(dispatchDeliveryRouteStops).values({
                id: crypto.randomUUID(),
                tenantId,
                routeId,
                orderId: order.id,
                sequenceIndex: seq++
            });

            await db.update(dispatchDeliveryOrders)
                .set({ status: 'routed' })
                .where(eq(dispatchDeliveryOrders.id, order.id));

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
            .where(and(eq(dispatchDeliveryOrders.tenantId, tenantId), eq(dispatchDeliveryOrders.id, orderId)));

        await db.insert(dispatchDeliveryEvents).values({
            id: crypto.randomUUID(),
            tenantId,
            orderId,
            status: newOrderStatus,
            description: description || `Status updated to ${newOrderStatus} by technician`
        });

        const remaining = await db.select({ id: dispatchDeliveryRouteStops.id })
            .from(dispatchDeliveryRouteStops)
            .where(and(eq(dispatchDeliveryRouteStops.routeId, routeId), eq(dispatchDeliveryRouteStops.status, 'pending')));

        if (remaining.length === 0) {
            await db.update(dispatchDeliveryRoutes)
                .set({ status: 'completed' })
                .where(and(eq(dispatchDeliveryRoutes.tenantId, tenantId), eq(dispatchDeliveryRoutes.id, routeId)));
        } else {
            // First step updates to in_progress
            await db.update(dispatchDeliveryRoutes)
                .set({ status: 'in_progress' })
                .where(and(
                    eq(dispatchDeliveryRoutes.tenantId, tenantId),
                    eq(dispatchDeliveryRoutes.id, routeId),
                    eq(dispatchDeliveryRoutes.status, 'pending')
                ));
        }

        return newOrderStatus;
    }
}

export const dispatchService = new DispatchService();
