import { NextRequest, NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { getTenantContext } from '@/infra/auth/tenant-context';
import { logger } from '@/infra/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Tenant from verified session cookie - never from query param
        const { tenantId } = await getTenantContext(request);

        // 1. Message Metrics (Today + Total + Breakdown)
        const [msgsToday, msgsTotal] = await Promise.all([
            messageRepository.getMetricsToday(tenantId),
            messageRepository.getMetricsTotal(tenantId),
        ]);

        // 2. Simulation Metrics
        let totalSimulations = 0;
        let simulationsToday = 0;
        try {
            [totalSimulations, simulationsToday] = await Promise.all([
                simulationRepository.countTotal(tenantId),
                simulationRepository.countToday(tenantId)
            ]);
        } catch (err) {
            logger.warn('Simulation metrics failed', { reason: 'table_missing' }, err as Error);
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
