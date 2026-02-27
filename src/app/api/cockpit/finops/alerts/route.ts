import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../infra/db';
import { finopsAlertEvents } from '../../../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { errorResponse, ErrorCode } from '../../../../../infra/http/error-response';
import { logger } from '../../../../../infra/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);

    try {
        const auth = await requireAdmin(request, { requestId });
        if (!auth.ok) {
            return auth.response;
        }

        const tenantId = auth.session.tenantId;

        const url = request.nextUrl;
        const limitStr = url.searchParams.get('limit') ?? '50';
        const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 50));

        const db = await getDb();
        const records = await db
            .select()
            .from(finopsAlertEvents)
            .where(eq(finopsAlertEvents.tenantId, tenantId))
            .orderBy(desc(finopsAlertEvents.createdAt))
            .limit(limit);

        const response = NextResponse.json(records);
        attachRequestIdHeader(response, requestId);
        return response;
    } catch (err) {
        logger.error('cockpit_finops_alerts_error', err as Error, { requestId });
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Erro ao carregar os alertas do FinOps.');
    }
}
