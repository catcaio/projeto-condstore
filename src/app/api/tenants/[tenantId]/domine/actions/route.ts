import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';
import { getDb } from '@/infra/db';
import { domineFreightQuotes } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const actionsSchema = z.object({
    action: z.enum(['lookup_order', 'lookup_freight', 'create_support_ticket']),
    parameters: z.any()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
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
        const body = await req.json();
        const parsed = actionsSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid action payload');
        }

        const { action, parameters } = parsed.data;

        if (action === 'lookup_order') {
            const { orderId } = parameters;
            const order = await domineReadRepository.getOrder((await params).tenantId, orderId);
            return NextResponse.json({ ok: true, data: order || null });
        }

        if (action === 'lookup_freight') {
            // we can look up latest or specific quote
            const { correlationId } = parameters;
            const db = await getDb();
            if (correlationId) {
                const q = await db.select().from(domineFreightQuotes).where(eq(domineFreightQuotes.correlationId, correlationId));
                return NextResponse.json({ ok: true, data: q[0] || null });
            } else {
                const latest = await db.select().from(domineFreightQuotes)
                    .where(eq(domineFreightQuotes.tenantId, (await params).tenantId))
                    .orderBy(desc(domineFreightQuotes.createdAt));
                return NextResponse.json({ ok: true, data: latest[0] || null });
            }
        }

        if (action === 'create_support_ticket') {
            // Stub
            return NextResponse.json({
                ok: true,
                message: 'Support ticket created (Stub)',
                ticketId: `TICKET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            });
        }

        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Action unrecognized');
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
