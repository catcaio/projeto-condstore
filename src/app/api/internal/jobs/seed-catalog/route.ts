import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { getDb } from '@/infra/db';
import { products } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import {
    LOJACOND_CATALOG,
    validateCatalog,
    buildProductRows,
} from '../../../../../../scripts/seed-catalog';

export const revalidate = 0;

export async function POST(req: NextRequest) {
    const requestId = makeRequestId(req);

    const tokenGuard = requireInternalToken(req, { purpose: ['jobs'] });
    if (!tokenGuard.ok) return tokenGuard.response;

    const targetTenantId = req.nextUrl.searchParams.get('tenantId') || req.headers.get('x-tenant-id');
    if (!targetTenantId) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing required parameter: tenantId');
    }

    // Require explicit authorization to load demo/founder catalog fixtures
    const allowDemoCatalog = req.nextUrl.searchParams.get('allowDemoCatalog') === 'true' ||
        process.env.ALLOW_DEMO_CATALOG_SEED === 'true';

    if (!allowDemoCatalog) {
        return errorResponse(
            ErrorCode.FORBIDDEN,
            403,
            requestId,
            'Loading the demo catalog fixture requires explicit authorization (allowDemoCatalog=true)'
        );
    }

    try {
        const db = await getDb();

        const validation = validateCatalog(LOJACOND_CATALOG);
        if (!validation.valid) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, validation.errors.join('; '));
        }

        const rows = buildProductRows(targetTenantId, LOJACOND_CATALOG);

        let inserted = 0;
        let updated = 0;

        for (const row of rows) {
            const [existing] = await db.select({ id: products.id })
                .from(products)
                .where(and(eq(products.tenantId, row.tenantId), eq(products.id, row.id)))
                .limit(1);

            if (existing) {
                // Ensure UPDATE strictly filters by both products.id and products.tenantId
                await db.update(products).set({
                    name: row.name,
                    sku: row.sku,
                    price: row.price,
                    weight: row.weight,
                    width: row.width,
                    height: row.height,
                    length: row.length,
                }).where(and(eq(products.id, row.id), eq(products.tenantId, row.tenantId)));
                updated++;
            } else {
                await db.insert(products).values(row);
                inserted++;
            }
        }

        structuredLogger.info('seed_catalog_completed', {
            requestId,
            tenantId: targetTenantId,
            totalProducts: rows.length,
            inserted,
            updated,
        });

        return NextResponse.json({
            ok: true,
            tenantId: targetTenantId,
            totalProducts: rows.length,
            inserted,
            updated,
        });
    } catch (err: any) {
        structuredLogger.error('seed_catalog_error', {
            requestId,
            error: err.message,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
