import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { getDb } from '@/infra/db';
import { products } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import {
    LOJACOND_TENANT_ID,
    LOJACOND_CATALOG,
    validateCatalog,
    buildProductRows,
} from '../../../../../../scripts/seed-catalog';

export const revalidate = 0;

export async function POST(req: NextRequest) {
    const requestId = makeRequestId(req);

    const tokenGuard = requireInternalToken(req, { purpose: ['jobs'] });
    if (!tokenGuard.ok) return tokenGuard.response;

    try {
        const validation = validateCatalog(LOJACOND_CATALOG);
        if (!validation.valid) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, validation.errors.join('; '));
        }

        const rows = buildProductRows(LOJACOND_TENANT_ID, LOJACOND_CATALOG);
        const db = await getDb();

        let inserted = 0;
        let updated = 0;

        for (const row of rows) {
            const [existing] = await db.select({ id: products.id })
                .from(products)
                .where(and(eq(products.tenantId, row.tenantId), eq(products.id, row.id)))
                .limit(1);

            if (existing) {
                await db.update(products).set({
                    name: row.name,
                    sku: row.sku,
                    price: row.price,
                    weight: row.weight,
                    width: row.width,
                    height: row.height,
                    length: row.length,
                }).where(eq(products.id, row.id));
                updated++;
            } else {
                await db.insert(products).values(row);
                inserted++;
            }
        }

        structuredLogger.info('seed_catalog_completed', {
            requestId,
            tenantId: LOJACOND_TENANT_ID,
            totalProducts: rows.length,
            inserted,
            updated,
        });

        return NextResponse.json({
            ok: true,
            tenantId: LOJACOND_TENANT_ID,
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
