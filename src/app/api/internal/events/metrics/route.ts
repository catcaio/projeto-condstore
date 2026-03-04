export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/internal/events/metrics
 * ─────────────────────────────────────────────────────────────────────────────
 * Expõe métricas de backlog e DLQ do Redis Stream do worker FinOps
 * e do stream de Webhook.
 * Auth: x-internal-token (mesmo token de /api/internal/diag)
 *
 * Query params (opcionais):
 *   ?stream=events:finops   (padrão)
 *   ?group=finops-group     (padrão)
 *
 * Resposta:
 * {
 *   lag: { stream, group, pending, streamLength, undelivered, oldestPendingId, consumerCount, collectedAt },
 *   dlq: { stream, dlqStream, dlqCount, collectedAt }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStreamLag, getDLQCount } from '../../../../../core/events/event-metrics';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';
import { webhookEventRepository } from '../../../../../infra/repositories/webhook-event.repository';

const DEFAULT_STREAM = 'events:finops';
const DEFAULT_GROUP = 'finops-group';
const WEBHOOK_STREAM = 'events:webhook';
const WEBHOOK_GROUP = 'webhook-group';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/internal/events/metrics';

    structuredLogger.info('internal_events_metrics_start', { requestId, route });

    // ── Auth ─────────────────────────────────────────────────────────────
    const authResult = requireInternalToken(request, { purpose: ['diag', 'export'] });
    if (!authResult.ok) return authResult.response;

    // ── Params ────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream') || DEFAULT_STREAM;
    const group = searchParams.get('group') || DEFAULT_GROUP;

    // ── Collect finops ────────────────────────────────────────────────────
    const [lag, dlq] = await Promise.allSettled([
        getStreamLag(stream, group),
        getDLQCount(stream),
    ]);

    // ── Collect webhook ───────────────────────────────────────────────────
    const [webhookLag, webhookDlq, webhookFailed] = await Promise.allSettled([
        getStreamLag(WEBHOOK_STREAM, WEBHOOK_GROUP),
        getDLQCount(WEBHOOK_STREAM),
        webhookEventRepository.countFailed(),
    ]);

    const payload = {
        stream,
        group,
        lag: lag.status === 'fulfilled' ? lag.value : { error: String((lag as PromiseRejectedResult).reason) },
        dlq: dlq.status === 'fulfilled' ? dlq.value : { error: String((dlq as PromiseRejectedResult).reason) },
        webhook: {
            lag: webhookLag.status === 'fulfilled' ? webhookLag.value : { error: String((webhookLag as PromiseRejectedResult).reason) },
            dlq: webhookDlq.status === 'fulfilled' ? webhookDlq.value : { error: String((webhookDlq as PromiseRejectedResult).reason) },
            failedCount: webhookFailed.status === 'fulfilled' ? webhookFailed.value : 0,
        },
    };

    const response = NextResponse.json(payload, { status: 200 });
    attachRequestIdHeader(response, requestId);

    structuredLogger.info('internal_events_metrics_end', {
        requestId,
        route,
        durationMs: Date.now() - startedAt,
        pending: lag.status === 'fulfilled' ? lag.value?.pending : null,
    });

    return response;
}
