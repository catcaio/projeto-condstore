import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { playbooksService } from '@/modules/playbooks/playbooks.service';
import { CreatePlaybookSchema, PlaybookEntity } from '@/modules/playbooks/playbooks.types';

export async function GET(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(req.url);
        const entity = searchParams.get('entity') as PlaybookEntity | undefined;

        const tenantId = auth.session.tenantId;

        const playbooks = await playbooksService.listPlaybooks(tenantId, entity);

        return NextResponse.json({ ok: true, data: playbooks });
    } catch (e) {
        console.error('[GET /api/cockpit/playbooks]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'playbook_list_failed'
        });
    }
}

export async function POST(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const body = await req.json();
        const parsed = CreatePlaybookSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', {
                errors: parsed.error.format()
            });
        }

        const playbook = await playbooksService.createPlaybook(
            auth.session.tenantId, 
            parsed.data, 
            auth.session.sub
        );

        return NextResponse.json({ ok: true, data: playbook }, { status: 201 });
    } catch (e: any) {
        console.error('[POST /api/cockpit/playbooks]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message || 'Internal Server Error', {
            systemEventId: 'playbook_create_failed'
        });
    }
}
