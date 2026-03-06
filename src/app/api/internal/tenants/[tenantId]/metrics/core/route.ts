export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { getTenantCoreMetrics } from '@/lib/metrics/cockpit-metrics-engine';

const DEFAULT_RANGE_DAYS = 30;

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId is required');
    }

    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
        ? new Date(fromParam)
        : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid date range');
    }

    if (from > to) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, '"from" must be before "to"');
    }

    try {
        const metrics = await getTenantCoreMetrics(tenantId, { from, to });

        structuredLogger.info('cockpit_metrics_core_fetched', {
            requestId,
            tenantId,
            eventType: 'cockpit_metrics_core_fetched',
        });

        return NextResponse.json({ ok: true, data: metrics });
    } catch (err) {
        structuredLogger.error('cockpit_metrics_core_error', { requestId, tenantId, error: err });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to fetch metrics');
    }
};
