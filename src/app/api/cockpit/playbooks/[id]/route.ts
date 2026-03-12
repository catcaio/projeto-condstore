import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { playbooksService } from '@/modules/playbooks/playbooks.service';
import { UpdatePlaybookSchema } from '@/modules/playbooks/playbooks.types';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const resolvedParams = 'then' in context.params ? await context.params : context.params;
        const playbookId = resolvedParams.id;
        const tenantId = auth.session.tenantId;

        const playbook = await playbooksService.getPlaybook(tenantId, playbookId);
        if (!playbook) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Playbook not found');
        }

        return NextResponse.json({ ok: true, data: playbook });
    } catch (e: any) {
        console.error('[GET /api/cockpit/playbooks/[id]]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message || 'Internal Server Error', {
            systemEventId: 'playbook_fetch_failed'
        });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const resolvedParams = 'then' in context.params ? await context.params : context.params;
        const playbookId = resolvedParams.id;
        const tenantId = auth.session.tenantId;

        const body = await req.json();
        const parsed = UpdatePlaybookSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', {
                errors: parsed.error.format()
            });
        }

        const playbook = await playbooksService.updatePlaybook(
            tenantId,
            playbookId,
            parsed.data,
            auth.session.sub
        );

        return NextResponse.json({ ok: true, data: playbook });
    } catch (e: any) {
        console.error('[PUT /api/cockpit/playbooks/[id]]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message || 'Internal Server Error', {
            systemEventId: 'playbook_update_failed'
        });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const resolvedParams = 'then' in context.params ? await context.params : context.params;
        const playbookId = resolvedParams.id;
        const tenantId = auth.session.tenantId;

        await playbooksService.deletePlaybook(tenantId, playbookId);

        return NextResponse.json({ ok: true, data: { deleted: true } });
    } catch (e: any) {
        console.error('[DELETE /api/cockpit/playbooks/[id]]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message || 'Internal Server Error', {
            systemEventId: 'playbook_delete_failed'
        });
    }
}
