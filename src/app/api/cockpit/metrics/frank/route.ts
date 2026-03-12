import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { structuredLogger } from '@/infra/log/logger';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '@/infra/http/error-response';
import {
    getFrankAssistMetrics,
    type FrankAssistOutcomeFilter,
} from '@/modules/frank/frank-assist-metrics.service';

const PERIOD_WINDOW_DAYS = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
} as const;

function normalizePeriod(value: string | null): '7d' | '30d' | '90d' | 'custom' {
    if (!value) {
        return '30d';
    }

    if (value === '7d' || value === '30d' || value === '90d') {
        return value;
    }

    return 'custom';
}

function normalizeOutcome(value: string | null): FrankAssistOutcomeFilter {
    if (value === 'success' || value === 'fallback' || value === 'handoff') {
        return value;
    }

    return 'all';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/cockpit/metrics/frank';
    let tenantId: string | undefined;

    const finalize = (response: NextResponse, code?: ErrorCode) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('cockpit_metrics_frank_end', {
            requestId,
            tenantId,
            route,
            eventType: 'route_end',
            durationMs: Date.now() - startedAt,
            status: response.status,
            outcome: response.status >= 400 ? 'error' : 'ok',
            errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
        });
        return response;
    };

    structuredLogger.info('cockpit_metrics_frank_start', {
        requestId,
        route,
        eventType: 'route_start',
    });

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) {
        return finalize(auth.response, auth.code);
    }

    tenantId = auth.session.tenantId;

    try {
        const url = request.nextUrl;
        const requestedTenantId = url.searchParams.get('tenantId')?.trim();
        if (requestedTenantId && requestedTenantId !== tenantId) {
            return finalize(
                NextResponse.json({ error: 'Cross-tenant access forbidden' }, { status: 403 }),
                ErrorCode.FORBIDDEN,
            );
        }

        const period = normalizePeriod(url.searchParams.get('period'));
        const outcome = normalizeOutcome(url.searchParams.get('outcome'));
        const intent = url.searchParams.get('intent')?.trim() || null;
        const q = url.searchParams.get('q')?.trim() || null;
        const dateStart = url.searchParams.get('dateStart');
        const dateEnd = url.searchParams.get('dateEnd');

        let to = dateEnd ? new Date(dateEnd) : new Date();
        let from = dateStart ? new Date(dateStart) : new Date();

        if (!dateStart) {
            const days = period === 'custom' ? PERIOD_WINDOW_DAYS['30d'] : PERIOD_WINDOW_DAYS[period];
            from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
        }

        if (!dateEnd) {
            to = new Date();
        }

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            return finalize(
                errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid date range'),
                ErrorCode.VALIDATION_ERROR,
            );
        }

        if (from > to) {
            return finalize(
                errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, '"dateStart" must be before "dateEnd"'),
                ErrorCode.VALIDATION_ERROR,
            );
        }

        const data = await getFrankAssistMetrics({
            tenantId,
            from,
            to,
            period: dateStart || dateEnd ? 'custom' : period,
            intent,
            outcome,
            q,
        });

        return finalize(
            NextResponse.json(
                {
                    ok: true,
                    data,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'private, max-age=30',
                    },
                },
            ),
        );
    } catch (error) {
        structuredLogger.error('cockpit_metrics_frank_failed', {
            requestId,
            tenantId,
            route,
            eventType: 'route_error',
            durationMs: Date.now() - startedAt,
            errorCode: ErrorCode.DB_ERROR,
            error,
        });

        return finalize(
            errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load Frank assist metrics'),
            ErrorCode.DB_ERROR,
        );
    }
}
