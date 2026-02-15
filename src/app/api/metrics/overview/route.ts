import { NextRequest, NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository';
// Import simulationRepository gracefully - if it fails (it shouldn't based on previous checks), we handle it
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { logger } from '@/infra/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Require tenant_id query parameter
        const tenantId = request.nextUrl.searchParams.get('tenant_id');
        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenant_id query parameter is required' },
                { status: 400 }
            );
        }

        // 1. Message Metrics (Today + Total + Breakdown)
        const [msgsToday, msgsTotal] = await Promise.all([
            messageRepository.getMetricsToday(tenantId),
            messageRepository.getMetricsTotal(tenantId),
        ]);

        // 2. Simulation Metrics (Try/Catch wrapper in case table missing/error)
        let totalSimulations = 0;
        let simulationsToday = 0;
        try {
            [totalSimulations, simulationsToday] = await Promise.all([
                simulationRepository.countTotal(tenantId),
                simulationRepository.countToday(tenantId)
            ]);
        } catch (err) {
            logger.warn('Simulation metrics failed', { reason: 'table_missing' }, err as Error);
            // Fallback to 0 as requested
        }

        // 3. Construct Response
        return NextResponse.json({
            tenantId,
            totalMessages: msgsTotal.total,
            totalSimulations: totalSimulations,
            messagesToday: msgsToday.total,
            simulationsToday: simulationsToday,
            intentsBreakdownToday: msgsToday.breakdown,
            intentsBreakdownTotal: msgsTotal.breakdown
        }, { status: 200 });

    } catch (err) {
        logger.error('Metrics overview failed', err as Error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
