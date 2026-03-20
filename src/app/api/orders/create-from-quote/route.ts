import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrderFromSimulation } from '@/modules/pedidos/server';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';
import { NextRequest } from 'next/server';
import { structuredLogger } from '@/infra/log/logger';
import { redisClient } from '@/infra/redis.client';

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

        const lockKey = `lock:order:simulation:${data.simulationId}`;
        const lockAcquired = await redisClient.setNx(lockKey, '1', 60);

        if (!lockAcquired) {
            structuredLogger.warn('api_orders_create_from_quote_duplicate', {
                simulationId: data.simulationId,
                tenantId,
            });
            return NextResponse.json(
                { error: 'Order creation already in progress or completed for this simulation' },
                { status: 409 },
            );
        }

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
        structuredLogger.error('api_orders_create_from_quote_error', {
            errorType: error?.name,
            errorMessage: error?.message,
            route: '/api/orders/create-from-quote',
        });
        return NextResponse.json(
            { error: error?.message || 'Failed to create order from simulation' },
            { status: 500 },
        );
    }
}
