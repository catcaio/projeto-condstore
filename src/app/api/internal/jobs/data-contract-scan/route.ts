export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { getDb } from '@/infra/db';
import { makeRequestId, attachRequestIdHeader } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { withDistributedLock } from '@/lib/http/with-distributed-lock';
import { jobLock } from '@/lib/infra/lock-keys';
import { validateTenantDataContract } from '@/lib/governance/tenant-data-contract';
import { tenants, tenantDataContractStatus } from '@/drizzle/schema';
import { sql } from 'drizzle-orm';

async function postHandler(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/internal/jobs/data-contract-scan';

    const authResult = requireInternalToken(request, { purpose: ['jobs'] });
    if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

    structuredLogger.info('data_contract_scan_start', {
        requestId,
        route,
        eventType: 'internal_job_start',
    });

    try {
        const db = await getDb();

        // Fetch all tenant IDs
        const allTenants = await db.select({ id: tenants.id }).from(tenants);

        let tenantsScanned = 0;
        let tenantsReady = 0;
        let tenantsMissing = 0;

        for (const { id: tenantId } of allTenants) {
            const result = await validateTenantDataContract(tenantId, db as any);
            tenantsScanned++;

            const allReady =
                result.acquisition_ready &&
                result.conversion_ready &&
                result.revenue_ready &&
                result.retention_ready &&
                result.operational_ready;

            if (allReady) tenantsReady++;
            else tenantsMissing++;

            // Upsert into tenant_data_contract_status
            await db.execute(sql`
        INSERT INTO tenant_data_contract_status
          (tenant_id, acquisition_ready, conversion_ready, revenue_ready, retention_ready, operational_ready, last_checked_at)
        VALUES
          (${tenantId}, ${result.acquisition_ready}, ${result.conversion_ready}, ${result.revenue_ready}, ${result.retention_ready}, ${result.operational_ready}, NOW())
        ON DUPLICATE KEY UPDATE
          acquisition_ready = VALUES(acquisition_ready),
          conversion_ready  = VALUES(conversion_ready),
          revenue_ready     = VALUES(revenue_ready),
          retention_ready   = VALUES(retention_ready),
          operational_ready = VALUES(operational_ready),
          last_checked_at   = NOW()
      `);
        }

        const stats = { tenants_scanned: tenantsScanned, tenants_ready: tenantsReady, tenants_missing: tenantsMissing };

        structuredLogger.info('data_contract_scan_end', {
            requestId,
            route,
            eventType: 'internal_job_end',
            durationMs: Date.now() - startedAt,
            ...stats,
        });

        const response = NextResponse.json({ ok: true, data: stats }, { status: 200 });
        attachRequestIdHeader(response, requestId);
        return response;
    } catch (error) {
        structuredLogger.error('data_contract_scan_failed', {
            requestId,
            route,
            eventType: 'internal_job_error',
            errorCode: ErrorCode.DB_ERROR,
            durationMs: Date.now() - startedAt,
            error,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Data contract scan failed');
    }
}

export const POST = withDistributedLock(() => jobLock('data-contract-scan'), 600, postHandler);
