import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';
import { getDb } from '@/infra/db';
import { domineFreightQuotes } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const authHeaders = req.headers.get('authorization');
    let isAuthorized = false;

    try {
        const token = getInternalExportTokenOrThrow();
        if (authHeaders === `Bearer ${token}`) {
            isAuthorized = true;
        }
    } catch { }

    if (!isAuthorized) {
        const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
        if (guard.ok && guard.sessionUser.role === 'admin') {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const db = await getDb();
        const latest = await db.select().from(domineFreightQuotes)
            .where(eq(domineFreightQuotes.tenantId, (await params).tenantId))
            .orderBy(desc(domineFreightQuotes.createdAt))
            .limit(1);

        if (latest.length === 0) {
            return errorResponse(ErrorCode.UNKNOWN, 404, requestId, 'No quote found');
        }

        return NextResponse.json({ data: latest[0] });
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
