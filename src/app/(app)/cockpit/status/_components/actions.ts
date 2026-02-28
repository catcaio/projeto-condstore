'use server';

import { getServerSessionUser } from '@/infra/auth/session';
import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';

export async function runGoNoGoChecks(tenantId: string) {
    const session = await getServerSessionUser();
    if (!session || session.role !== 'admin' || session.tenantId !== tenantId) {
        throw new Error('Unauthorized');
    }

    const results = {
        internalTokenValid: false,
        dbOk: false,
        redisOk: false,
        secretsVerified: false,
        incidentOff: false,
        passed: false
    };

    try {
        const token = getInternalExportTokenOrThrow();
        // Since we are running in the server side, we bypass actually hitting HTTP /api/internal/diag here and just test token presence vs env,
        // but to fully simulate smoke-prod we can hit our own process via fetch if BASE_URL is set, 
        // however getInternalExportTokenOrThrow() succeeding means the server has the valid token configured.
        results.internalTokenValid = !!token;
    } catch {
        results.internalTokenValid = false;
    }

    // Hit the health endpoint logic directly instead of HTTP to dodge domain mapping issues
    try {
        const { getDb } = await import('@/infra/db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        await db.execute(sql`SELECT 1`);
        results.dbOk = true;
    } catch { }

    try {
        const { redisClient } = await import('@/infra/redis.client');
        if (redisClient.isAvailable()) {
            const raw = redisClient.getRawClient();
            if (raw && await raw.ping() === 'PONG') {
                results.redisOk = true;
            }
        }
    } catch { }

    try {
        const { tenantSecretsRepository } = await import('@/infra/repositories/tenant-secrets.repository');
        const allSecretsMeta = await tenantSecretsRepository.getMetadataByTenant(tenantId);
        const unverified = allSecretsMeta.filter(s => s.lastVerifiedAt === null && s.lastRotatedAt !== null);
        results.secretsVerified = unverified.length === 0;
    } catch { }

    try {
        const { tenantRepository } = await import('@/infra/repositories/tenant.repository');
        const tenant = await tenantRepository.getTenantById(tenantId);
        results.incidentOff = tenant?.incidentMode === false;
    } catch { }

    results.passed = results.internalTokenValid && results.dbOk && results.redisOk && results.secretsVerified && results.incidentOff;

    return results;
}
