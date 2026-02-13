
import { NextResponse } from 'next/server';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { logger } from '../../../infra/logger';

export async function GET() {
    try {
        const simulations = await simulationRepository.getRecentSimulations(10);

        // Transform DB record to Frontend Simulation type if necessary
        // Current Simulation type in frontend expects simulation.input.cep etc.
        // Our DB has records as flat objects.

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
                    deliveryTime: 0, // Not stored in detail, but carrier/price are the main history items
                },
                options: [] // Detail not needed for history list
            }
        }));

        return NextResponse.json({ success: true, history: formattedHistory });
    } catch (error) {
        logger.error('Failed to fetch history', error as Error);
        return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
    }
}
