import { db } from '@/db/client';
import { 
    orders, 
    orderItems, 
    orderStatusHistory, 
    freightSimulations, 
    customerTimelineEvents,
    freightShipments 
} from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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

    // 1. Retrieve the freight simulation to ensure it exists and matches tenant
    const simulationRecs = await db
        .select()
        .from(freightSimulations)
        .where(
            and(
                eq(freightSimulations.tenantId, tenantId),
                eq(freightSimulations.id, simulationId)
            )
        )
        .limit(1);

    if (simulationRecs.length === 0) {
        throw new Error(`Simulation ${simulationId} not found for tenant ${tenantId}`);
    }

    const simulation = simulationRecs[0];
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
            .where(
                and(
                    eq(freightShipments.tenantId, tenantId),
                    eq(freightShipments.simulationId, simulationId)
                )
            );

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

    return {
        orderId,
        status: 'created',
        shipmentLink: `/logistica/rastreamento?orderId=${orderId}`, // Typical deep-link pattern
    };
}
