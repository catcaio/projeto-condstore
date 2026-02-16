import { NextRequest, NextResponse } from 'next/server';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { getTenantContext } from '../../../infra/auth/tenant-context';
import { logger } from '../../../infra/logger';

export async function GET(request: NextRequest) {
    try {
        const { tenantId } = await getTenantContext(request);

        const simulations = await simulationRepository.getRecentSimulations(tenantId, 10);

        const formattedHistory = simulations.map(s => ({
            id: s.id,
            date: s.createdAt.toISOString(),
            input: {
                cep: s.cep,
                quantity: s.quantity,
                weight: Number(s.weight)
            },
            ranking: {
                bestOption: {
                    carrier: s.bestCarrier,
                    service: s.bestService,
                    price: Number(s.bestPrice),
                    deliveryTime: 0,
                },
                options: []
            }
        }));

        return NextResponse.json({ success: true, history: formattedHistory });
    } catch (error) {
        logger.error('Failed to fetch history', error as Error);
        return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
    }
}
