/**
 * Query oficial do panorama de métricas (issue #396).
 *
 * Única fonte reutilizável para `GET /api/metrics/overview`. A rota é
 * apresentação (auth/cache/logs) e não recalcula KPIs.
 */

import { logger } from '@/infra/logger';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';

export interface MetricsOverview {
    tenantId: string;
    totalMessages: number;
    totalSimulations: number;
    messagesToday: number;
    simulationsToday: number;
    intentsBreakdownToday: Record<string, number>;
    intentsBreakdownTotal: Record<string, number>;
}

function requireTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
        throw new Error('tenant_id is required');
    }
}

/** Query oficial do overview — todas as leituras filtram por `tenantId`. */
export async function getMetricsOverview(tenantId: string): Promise<MetricsOverview> {
    requireTenant(tenantId);

    const [msgsToday, msgsTotal] = await Promise.all([
        messageRepository.getMetricsToday(tenantId),
        messageRepository.getMetricsTotal(tenantId),
    ]);

    let totalSimulations = 0;
    let simulationsToday = 0;
    try {
        [totalSimulations, simulationsToday] = await Promise.all([
            simulationRepository.countTotal(tenantId),
            simulationRepository.countToday(tenantId),
        ]);
    } catch (err) {
        logger.warn('Simulation metrics failed', { reason: 'table_missing' }, err as Error);
    }

    return {
        tenantId,
        totalMessages: msgsTotal.total,
        totalSimulations,
        messagesToday: msgsToday.total,
        simulationsToday,
        intentsBreakdownToday: msgsToday.breakdown,
        intentsBreakdownTotal: msgsTotal.breakdown,
    };
}
