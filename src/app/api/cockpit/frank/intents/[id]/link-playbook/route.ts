import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { intentLinkerService } from '@/modules/frank/intent-linker/intent-linker.service';
import { LinkPlaybookDTOSchema } from '@/modules/frank/intent-linker/intent-linker.types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    try {
        const payload = await request.json();
        const parsed = LinkPlaybookDTOSchema.safeParse(payload);
        
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', parsed.error.format());
        }

        const operatorId = (auth.session as any).sub || 'system';

        const ok = await intentLinkerService.linkExistingPlaybook(tenantId, id, parsed.data.playbookId, operatorId);

        if (!ok) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Intent not found or could not be linked');
        }

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to link intent to playbook');
    }
}
