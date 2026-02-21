import { NextRequest, NextResponse } from 'next/server';
import { simulationRepository } from '../../../infra/repositories/simulation.repository';
import { getTenantContext } from '../../../infra/auth/tenant-context';
import { logger } from '../../../infra/logger';
import { BaseError, ErrorCode } from '../../../infra/errors';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    // 1) Auth / tenant resolution
    let tenantId: string;
    try {
        const ctx = await getTenantContext(request);
        tenantId = ctx.tenantId;
    } catch (error) {
        if (error instanceof BaseError && error.code === ErrorCode.UNAUTHORIZED) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }
        if (error instanceof BaseError && error.code === ErrorCode.TENANT_NOT_FOUND) {
            return NextResponse.json({ error: 'MISSING_TENANT' }, { status: 400 });
        }
        logger.error('Unexpected auth error in /api/history', error as Error);
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

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
            meta: {
                count: items.length,
                tenantId,
            },
        });
    } catch (error: any) {
        logger.error('DB error in /api/history', error as Error, { tenantId });
        return NextResponse.json(
            {
                error: 'DB_ERROR',
                message: error?.message ?? 'Unknown database error',
                code: error?.code ?? undefined,
            },
            { status: 500 }
        );
    }
}
