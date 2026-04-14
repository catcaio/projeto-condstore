import { db } from '@/db/client';
import { redisClient } from '@/infra/redis.client';
import { 
    orders, 
    orderItems, 
    orderStatusHistory, 
    simulations,
    customerTimelineEvents,
    freightShipments 
} from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { withTenantNotDeleted } from '@/infra/db';
import { structuredLogger } from '@/infra/log/logger';

export interface CreateOrderParams {
    tenantId: string;
    simulationId: string;
    customerId: string;
    organizationId: string;
    createdBy: string;
    items: Array<{
        name: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
    }>;
}

/**
 * Service to execute the conversion of a Quote (Simulation) into a confirmed Order.
 * Implements the canonical flow for CONDSTORE OS operations.
 */
export async function createOrderFromSimulation(params: CreateOrderParams) {
    const { tenantId, simulationId, customerId, organizationId, createdBy, items } = params;

    const lockKey = `lock:create_order:${tenantId}:${simulationId}`;
    const acquiredLock = await redisClient.setNx(lockKey, '1', 10);
    
    if (!acquiredLock) {
        structuredLogger.warn('pedidos_create_order_race_condition_prevented', {
            tenantId,
            simulationId
        });
        throw new Error(`Order creation already in progress for simulation ${simulationId}`);
    }

    try {
        // 1. Retrieve the freight simulation to ensure it exists and matches tenant
    const simulationRecs = await db
        .select()
        .from(simulations)
        .where(
            and(
                eq(simulations.tenantId, tenantId),
                eq(simulations.id, simulationId)
            )
        )
        .limit(1);

    if (simulationRecs.length === 0) {
        throw new Error(`Simulation ${simulationId} not found for tenant ${tenantId}`);
    }

    const simulation = simulationRecs[0];

    if (simulation.status !== 'ACCEPTED') {
        const reason = simulation.status === 'CONVERTED' 
            ? 'already converted to order' 
            : `must be ACCEPTED (current: ${simulation.status})`;
            
        structuredLogger.warn('pedidos_create_order_from_simulation_blocked_status', {
            tenantId,
            simulationId,
            simulationStatus: simulation.status,
            reason
        });
        throw new Error(`Simulation ${simulationId} ${reason}`);
    }

    const orderId = randomUUID();

    // 2. Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // We use a transaction to guarantee atomicity of the order aggregate creation
    await db.transaction(async (tx) => {
        // 3. Create the order
        await tx.insert(orders).values({
            id: orderId,
            tenantId,
            customerId,
            status: 'created',
            freightSimulationId: simulationId,
            totalAmount: totalAmount.toString() as any, // Decimal type handling
            ownerId: createdBy, // Optionally map owner to the user making the request
        });

        // 4. Create the order items
        if (items.length > 0) {
            const itemsToInsert = items.map(item => ({
                id: randomUUID(),
                tenantId,
                orderId,
                name: item.name,
                sku: item.sku || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice.toString() as any,
                subtotal: (item.quantity * item.unitPrice).toString() as any,
            }));
            await tx.insert(orderItems).values(itemsToInsert as any);
        }

        // 5. Create initial order status history
        await tx.insert(orderStatusHistory).values({
            id: randomUUID(),
            tenantId,
            orderId,
            newStatus: 'created',
            reason: 'Order created from quoting flow',
            changedBy: createdBy,
        });

        // 6. Link shipment if one already exists for this simulation
        // (Typically shipments are created after orders, but we link in case of async race conditions or pre-auth flows)
        await tx.update(freightShipments)
            .set({ orderId })
            .where(withTenantNotDeleted(freightShipments, tenantId, eq(freightShipments.simulationId, simulationId)));

        // 6.5 Mark simulation as CONVERTED to prevent re-use
        await tx.update(simulations)
            .set({ 
                status: 'CONVERTED',
                convertedAt: new Date()
            })
            .where(and(
                eq(simulations.id, simulationId),
                eq(simulations.tenantId, tenantId)
            ));

        // 7. Generate Timeline Event
        await tx.insert(customerTimelineEvents).values({
            id: randomUUID(),
            tenantId,
            organizationId,
            entityType: 'ORDER',
            entityId: orderId,
            status: 'created',
            messagePublic: 'Pedido gerado a partir de simulação de frete aprovada.',
            metadataJson: {
                simulationId,
                createdBy,
                totalAmount
            },
        });
    });

    // 8. Emit ecosystem event (fire-and-forget, outside transaction)
    ecosystemEventsService.emitEvent({
        tenantId,
        type: 'order_created',
        entityType: 'order',
        entityId: orderId,
        payload: { simulationId, customerId, organizationId, totalAmount },
        actor: createdBy,
        source: 'pedidos',
    }).catch(() => {});

    return {
        orderId,
        status: 'created',
        shipmentLink: `/logistica/rastreamento?orderId=${orderId}`, // Typical deep-link pattern
    };
    } finally {
        await redisClient.del(lockKey).catch(() => {});
    }
}
