import { getDb } from '@/infra/db';
import { sql, eq, and } from 'drizzle-orm';
import { tenants, tenantSubscriptions, tenantAiProviders } from '@/drizzle/schema';
import { redisClient } from '@/infra/redis.client';
import { metricsRollupStatusRepository } from '@/modules/metrics/metrics-rollup-status.repository';

export function getEnvironmentInfo() {
    return {
        domain: process.env.VERCEL_ENV === 'production' ? 'app.condstoreos.com' : (process.env.VERCEL_URL || 'localhost'),
        env: process.env.VERCEL_ENV || 'development',
        gitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        nodeEnv: process.env.NODE_ENV,
        stripeEnabled: process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true',
    };
}

export async function getIntegrationsStatus(tenantId: string) {
    const db = await getDb();

    let stripeStatus = 'not_configured';
    if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true') {
        const sub = await db.select()
            .from(tenantSubscriptions)
            .where(eq(tenantSubscriptions.tenantId, tenantId))
            ;

        if (sub.length > 0) {
            stripeStatus = sub[0]?.status || 'unknown';
        } else {
            stripeStatus = 'not_started';
        }
    }

    const whatsappConfigured = !!process.env.TWILIO_ACCOUNT_SID;
    const melhorEnvioConfigured = !!process.env.MELHOR_ENVIO_TOKEN;

    const aiProviders = await db.select({ count: sql<number>`count(*)` })
        .from(tenantAiProviders)
        .where(and(eq(tenantAiProviders.tenantId, tenantId), eq(tenantAiProviders.isEnabled, 1)));

    const aiEnabledCount = Number(aiProviders[0]?.count || 0);

    let dbOk = false;
    try {
        await db.execute(sql`SELECT 1 AS ok`);
        dbOk = true;
    } catch { }

    const redisOk = await redisClient.ping();
    const rollupStatus = await metricsRollupStatusRepository.getByTenant(tenantId);

    return {
        stripe: stripeStatus,
        whatsapp: whatsappConfigured,
        melhorEnvio: melhorEnvioConfigured,
        aiProviders: aiEnabledCount,
        dbOk,
        redisOk: !!redisOk,
        rollupOk: rollupStatus?.status === 'ok',
    };
}

export async function getTenantBasics(tenantId: string) {
    const db = await getDb();

    const tResult = await db.select({
        id: tenants.id,
        name: tenants.name,
        createdAt: tenants.createdAt,
        plan: tenants.plan,
        planStatus: tenants.planStatus,
        updatedAt: tenants.createdAt, // Since there is no updatedAt column on tenants, let's map it safely to createdAt to fit dynamic card requirements
    }).from(tenants).where(eq(tenants.id, tenantId));

    const tenant = tResult[0];

    if (tenant) {
        // Obter plano real se assinado
        const subResult = await db.select({ planId: tenantSubscriptions.planId })
            .from(tenantSubscriptions)
            .where(and(eq(tenantSubscriptions.tenantId, tenantId), eq(tenantSubscriptions.status, 'active')))
            ;

        if (subResult.length > 0 && subResult[0]?.planId) {
            tenant.plan = subResult[0].planId;
        }
    }

    return tenant || null;
}
