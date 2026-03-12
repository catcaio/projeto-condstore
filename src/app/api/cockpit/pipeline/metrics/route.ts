import { NextRequest, NextResponse } from 'next/server';
import { pipelineMetricsService } from '@/modules/atendimento/pipeline-metrics.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const metrics = await pipelineMetricsService.getMetrics(tenantId);
        return NextResponse.json({ ok: true, data: metrics });
    } catch (err: any) {
        logger.error('Failed to get pipeline metrics', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
