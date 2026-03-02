import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { requireActivePlan } from '../../../modules/billing/requireActivePlan';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';

async function _GET(request: NextRequest) {
    // 1) Auth / tenant resolution + Plan Entitlement
    const entitlement = await requireActivePlan(request);
    if (entitlement.errorResponse) {
        return entitlement.errorResponse;
    }
    const tenantId = entitlement.tenantId!;

    // 2) Fetch data
    try {
        const simulations = await simulationRepository.getRecentSimulations(tenantId, 10);

        const items = simulations.map(s => ({
            id: s.id,
            date: s.createdAt.toISOString(),
            input: {
                cep: s.cep,
                quantity: s.quantity,
                weight: Number(s.weight),
            },
            ranking: {
                bestOption: {
                    carrier: s.bestCarrier,
                    service: s.bestService,
                    price: Number(s.bestPrice),
                    deliveryTime: 0,
                },
                options: [],
            },
        }));

        return NextResponse.json({
            items,
            meta: { count: items.length, tenantId },
        });
    } catch (error: any) {
        logger.error('DB error in /api/history', error as Error, { tenantId });
        return NextResponse.json(
            { error: 'DB_ERROR', message: error?.message ?? 'Unknown database error' },
            { status: 500 }
        );
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
