import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { createProject } from '@/modules/governance/services/governance.service';
import { listSpaceProjects } from '@/modules/governance/repositories/governance.repository';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');

    if (!spaceId) {
        return errorResponse('BAD_REQUEST' as any, 400, requestId, 'Missing spaceId');
    }

    try {
        const projects = await listSpaceProjects(auth.session.tenantId, spaceId);
        return NextResponse.json({ ok: true, data: projects });
    } catch (err: any) {
        logger.error('governance_list_projects_error', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        const ctx = {
            tenantId: auth.session.tenantId,
            actorUserId: auth.session.sub,
            role: auth.session.role,
        };
        const project = await createProject(ctx, body);
        return NextResponse.json({ ok: true, data: project });
    } catch (err: any) {
        logger.error('governance_create_project_error', err as Error, { requestId });
        return errorResponse('BAD_REQUEST' as any, 400, requestId, err.message);
    }
}
