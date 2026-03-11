import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrderFromSimulation } from '@/modules/pedidos/order.service';

const createOrderSchema = z.object({
    tenantId: z.string().uuid(),
    simulationId: z.string().uuid(),
    customerId: z.string().uuid(),
    organizationId: z.string().uuid(),
    createdBy: z.string().uuid(),
    items: z.array(z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
    })).min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // 1. Validate Payload
        const parsed = createOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload structure', details: parsed.error.format() },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // 2. Execute Business Logic
        const result = await createOrderFromSimulation({
            tenantId: data.tenantId,
            simulationId: data.simulationId,
            customerId: data.customerId,
            organizationId: data.organizationId,
            createdBy: data.createdBy,
            items: data.items,
        });

        // 3. Return Success
        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('[API_ORDERS_CREATE_FROM_QUOTE] Error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to create order from simulation' },
            { status: 500 }
        );
    }
}
