import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrderFromSimulation } from '@/modules/pedidos/order.service';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';
import { NextRequest } from 'next/server';

const createOrderSchema = z.object({
    simulationId: z.string().uuid(),
    customerId: z.string().uuid(),
    organizationId: z.string().uuid(),
    items: z.array(z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
    })).min(1),
});

export async function POST(req: NextRequest) {
    try {
        // 0. Auth Guard — require internal token or admin session
        const auth = await requireInternalAuth(req, { purpose: ['any'] });
        if (!auth.ok) return auth.response;

        // Derive tenantId from authenticated session (never from body)
        const tenantId = auth.tenantId;
        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId could not be resolved from session' },
                { status: 403 },
            );
        }

        const body = await req.json();
        
        // 1. Validate Payload — tenantId is NOT accepted from body
        const parsed = createOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload structure', details: parsed.error.format() },
                { status: 400 },
            );
        }

        const data = parsed.data;

        // 2. Execute Business Logic
        const result = await createOrderFromSimulation({
            tenantId,
            simulationId: data.simulationId,
            customerId: data.customerId,
            organizationId: data.organizationId,
            createdBy: tenantId, // Use tenantId as fallback createdBy
            items: data.items,
        });

        // 3. Return Success
        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('[API_ORDERS_CREATE_FROM_QUOTE] Error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to create order from simulation' },
            { status: 500 },
        );
    }
}
