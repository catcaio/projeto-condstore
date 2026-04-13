import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { intentTrainingService } from '@/modules/frank/intents/intent.service';
import { applyFrankCockpitRateLimit } from '@/infra/security/frank-rate-limit';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/intents/[id]/validate' });
    if (rl.blocked) return rl.response;

    try {
        const payload = await request.json().catch(() => ({}));
        const operatorId = (auth.session as any).sub || 'system';

        const validated = await intentTrainingService.validateIntent(tenantId, id, operatorId);

        if (!validated) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Intent not found or already processed');
        }

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to validate intent');
    }
}
