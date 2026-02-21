import { NextRequest, NextResponse } from 'next/server';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { getSessionUser } from '../../../infra/auth/session';
import { logger } from '../../../infra/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    // 1) Auth / tenant resolution — from verified JWT session, never from headers
    const session = await getSessionUser(request);
    if (!session?.tenantId) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const tenantId = session.tenantId;

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
