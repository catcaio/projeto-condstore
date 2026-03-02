import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { getDb } from '@/infra/db';
import { tenantKnowledgeSources } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';

async function _POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string; sourceId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await getAuthContext(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    try {
        const db = await getDb();

        await db.update(tenantKnowledgeSources)
            .set({ status: 'ready' })
            .where(and(
                eq(tenantKnowledgeSources.id, (await params).sourceId),
                eq(tenantKnowledgeSources.tenantId, (await params).tenantId)
            ));

        // Audit log
        await adminAuditLogRepository.log({
            tenantId: (await params).tenantId,
            userId: guard.sessionUser.sub,
            action: 'KNOWLEDGE_SOURCE_MARKED_READY',
            metadata: { sourceId: (await params).sourceId, requestId }
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
