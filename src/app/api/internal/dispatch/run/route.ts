import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '../../../../../modules/dispatch/dispatch.service';
import { errorResponse } from '../../../../../infra/http/error-response';
import { makeRequestId } from '../../../../../infra/http/request-trace';
import { logger } from '../../../../../infra/logger';
import { getDb } from '../../../../../infra/db';
import { tenants } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Endpoint para ser chamado por um Scheduler/Cron externo às 08:00
 * Passa o Authorization: Bearer <ADMIN_SECRET>
 */
export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    // Internal API Auth Check (simulated for MVP)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev-secret-123'}`) {
        return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Invalid secret');
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    if (!date) {
        return errorResponse("VALIDATION_ERROR" as any, 400, requestId, 'Missing date query param (YYYY-MM-DD)');
    }

    try {
        const db = await getDb();
        const allTenants = await db.select({ id: tenants.id }).from(tenants);

        const results = [];

        for (const t of allTenants) {
            // Import and Route for everyone automatically.
            const importCount = await dispatchService.importOrders(t.id);
            const generatedRoutes = await dispatchService.generateRoutes(t.id, date);

            results.push({
                tenantId: t.id,
                importedOrders: importCount,
                routesCreated: generatedRoutes.length
            });
            logger.info(`Scheduled Dispatch ran for tenant ${t.id}`, { requestId, tenantId: t.id, importedOrders: importCount, routesCreated: generatedRoutes.length });
        }

        return NextResponse.json({ ok: true, report: results });
    } catch (e: any) {
        logger.error('Failed to run internal scheduled dispatch', e as Error, { requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
