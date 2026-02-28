import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { getDb } from '@/infra/db';
import { tenantKnowledgeSources } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';

export async function POST(req: NextRequest, { params }: { params: { tenantId: string; sourceId: string } }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    try {
        const db = await getDb();

        await db.update(tenantKnowledgeSources)
            .set({ status: 'ready' })
            .where(and(
                eq(tenantKnowledgeSources.id, params.sourceId),
                eq(tenantKnowledgeSources.tenantId, params.tenantId)
            ));

        // Audit log
        await adminAuditLogRepository.log({
            tenantId: params.tenantId,
            userId: guard.sessionUser.sub,
            action: 'KNOWLEDGE_SOURCE_MARKED_READY',
            metadata: { sourceId: params.sourceId, requestId }
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
