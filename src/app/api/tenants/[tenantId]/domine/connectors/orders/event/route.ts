import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { domineEventBus } from '@/modules/domine/event-bus.service';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { z } from 'zod';

const eventSchema = z.object({
    orderId: z.string().min(1),
    type: z.enum(['order_created', 'order_paid', 'order_shipped', 'order_delivered']),
    status: z.string().optional(),
    totals: z.any().optional(),
}).passthrough();

async function _POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    // Connector endpoints might need an API Key, but for now we'll support both admin session or a simple token, 
    // or since this is a stub for the pilot, just internal token or admin session.
    // The prompt says: "conector como produtores de eventos (sem integração externa ainda)"
    // And implies it's just a POST endpoint to receive webhook/events. Let's use session matching for now, OR valid internal token.

    // We use session if available (e.g. cockpit testing), else we might need another form of auth.
    // However, prompt only strictly says "Validar schema (zod). Idempotência por orderId + type."
    const authHeaders = req.headers.get('authorization');
    const isBearerAdmin = authHeaders === `Bearer ${process.env.INTERNAL_API_TOKEN}`; // Simple stub auth for internal processes, or fallback to session

    let isAuthorized = isBearerAdmin;
    if (!isAuthorized) {
        const guard = await getAuthContext(req, tenantIdFromRoute);
        if (guard.ok && guard.sessionUser.role === 'admin') {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden - Auth token or Admin session required.');
    }

    try {
        const body = await req.json();
        const parsed = eventSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid order event schema');
        }

        const payload = parsed.data;
        const idempotencyKey = `order_${payload.orderId}_${payload.type}`;

        // Redaction - remove any heavy PII like full raw address or credit card if accidentally present
        const redactedPayload = {
            orderId: payload.orderId,
            status: payload.status || payload.type,
            totals: payload.totals,
            // Allow other fields safely
            raw: 'redacted'
        };

        const result = await domineEventBus.publish(
            (await params).tenantId,
            'connector',
            payload.type,
            redactedPayload,
            { idempotencyKey }
        );

        return NextResponse.json({ ok: true, scheduled: result.inserted, eventId: result.id });
    } catch (error: any) {
        structuredLogger.error('domine_order_connector_err', { error: error.message });
        return errorResponse(ErrorCode.VALIDATION_ERROR, 500, requestId, 'Failed to process order event');
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
