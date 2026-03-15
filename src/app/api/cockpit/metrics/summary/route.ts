import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { metricsService } from '@/modules/atendimento/metrics.service';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = auth.session as any;

    try {
        const url = new URL(request.url);
        const windowFilter = url.searchParams.get('window') || '30d'; // Default 30 days
        const toDate = new Date();
        let fromDate: Date | undefined;

        if (windowFilter === 'today') {
            fromDate = new Date();
            fromDate.setHours(0, 0, 0, 0);
        } else if (windowFilter === '7d') {
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 7);
        } else if (windowFilter === '30d') {
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 30);
        } else if (windowFilter !== 'all') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Invalid window param. Use: today, 7d, 30d, all');
        }

        const metrics = await metricsService.getMetrics({
            tenantId,
            fromDate,
            toDate
        });

        return NextResponse.json({
            ok: true,
            data: metrics
        });
    } catch (err: any) {
        logger.error('Failed to resolve cockpit dashboard metrics', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
