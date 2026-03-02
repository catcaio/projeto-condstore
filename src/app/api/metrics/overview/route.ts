import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { logger } from '@/infra/logger';
import { requireActivePlan } from '@/modules/billing/requireActivePlan';

export const dynamic = 'force-dynamic';

async function _GET(request: NextRequest) {
    try {
        // 1) Auth / tenant resolution + Plan Entitlement
        const entitlement = await requireActivePlan(request);
        if (entitlement.errorResponse) {
            return entitlement.errorResponse;
        }
        const tenantId = entitlement.tenantId!;

        const [msgsToday, msgsTotal] = await Promise.all([
            messageRepository.getMetricsToday(tenantId),
            messageRepository.getMetricsTotal(tenantId),
        ]);

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

        return NextResponse.json({
            tenantId,
            totalMessages: msgsTotal.total,
            totalSimulations,
            messagesToday: msgsToday.total,
            simulationsToday,
            intentsBreakdownToday: msgsToday.breakdown,
            intentsBreakdownTotal: msgsTotal.breakdown,
        }, { status: 200 });

    } catch (err) {
        logger.error('Metrics overview failed', err as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
