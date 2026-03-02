import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { domineEventBus } from '@/modules/domine/event-bus.service';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { z } from 'zod';

const schema = z.object({
    type: z.string().min(1).max(128),
    idempotencyKey: z.string().min(1).max(255),
    payload: z.any().optional(),
});

async function _POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await getAuthContext(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid body structure.');
        }

        const { type, idempotencyKey, payload } = parsed.data;

        const result = await domineEventBus.publish(
            guard.tenantId,
            'cockpit',
            type,
            payload || {},
            { idempotencyKey, triggeredByUserId: guard.sessionUser.sub }
        );

        return NextResponse.json({ ok: true, result });
    } catch (e: any) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 500, requestId, e.message);
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
