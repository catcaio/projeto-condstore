import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineIntakeService, DomineIntakeError } from '@/domine/domine-intake.service';
import { PublishInputSchema } from '@/domine/contracts/event';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const body = await req.json();

        const parsed = PublishInputSchema.safeParse({
            tenantId: guard.tenantId,
            type: body.type,
            source: body.source ?? 'cockpit',
            payload: body.payload,
            idempotencyKey: body.idempotencyKey,
        });

        if (!parsed.success) {
            const msg = parsed.error.issues.map(i => i.message).join('; ');
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, msg);
        }

        const result = await domineIntakeService.publish(parsed.data);

        return NextResponse.json({ ok: true, result });
    } catch (e: any) {
        if (e instanceof DomineIntakeError) {
            const status = e.code === 'TENANT_NOT_ENABLED' ? 403 : 400;
            return errorResponse(e.code as ErrorCode, status, requestId, e.message);
        }
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
