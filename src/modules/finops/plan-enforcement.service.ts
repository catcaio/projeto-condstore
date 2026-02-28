import { getDb } from '../../infra/db';
import { simulations, messages } from '../../drizzle/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { redisClient } from '../../infra/redis.client';
import { tenantRepository } from '../../infra/repositories/tenant.repository';
import { PLAN_LIMITS, FINOPS_THRESHOLDS, PlanId, FinopsState } from '../../config/plan-limits';
import { logger } from '../../infra/logger';

export type ActionType = 'freight_simulation' | 'whatsapp_outbound';

export interface EnforcementResult {
    allowed: boolean;
    state: FinopsState;
    percentUsed: number;
    headers: Record<string, string>;
}

class PlanEnforcementService {
    private getMonthKey() {
        return new Date().toISOString().slice(0, 7); // YYYY-MM
    }

    async getTenantUsage(tenantId: string, monthKey: string) {
        const cacheKey = `finops:usage:${tenantId}:${monthKey}`;

        try {
            if (redisClient.isAvailable()) {
                const cached = await redisClient.get<{
                    freight_simulations_per_month: number;
                    whatsapp_outbound_per_month: number;
                    inbox_conversations_per_month: number;
                }>(cacheKey);
                if (cached) return cached;
            }
        } catch (err) {
            logger.warn('Failed to read usage from cache', { error: (err as Error).message });
        }

        const firstDayOfMonth = new Date(`${monthKey}-01T00:00:00Z`);

        const db = await getDb();

        const [{ count: simCount }] = await db.select({ count: sql<number>`count(*)` })
            .from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), gte(simulations.createdAt, firstDayOfMonth)));

        const [{ count: msgCount }] = await db.select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(and(eq(messages.tenantId, tenantId), gte(messages.createdAt, firstDayOfMonth)));

        const usage = {
            freight_simulations_per_month: Number(simCount || 0),
            whatsapp_outbound_per_month: Number(msgCount || 0),
            inbox_conversations_per_month: 0,
        };

        try {
            if (redisClient.isAvailable()) {
                await redisClient.set(cacheKey, usage, 60);
            }
        } catch (err) {
            logger.warn('Failed to write usage to cache', { error: (err as Error).message });
        }

        return usage;
    }

    async invalidateCache(tenantId: string) {
        try {
            if (redisClient.isAvailable()) {
                const monthKey = this.getMonthKey();
                await redisClient.del(`finops:usage:${tenantId}:${monthKey}`);
            }
        } catch (err) {
            logger.warn('Failed to invalidate usage cache', { error: (err as Error).message });
        }
    }

    async enforcePlanLimit(tenantId: string, action: ActionType): Promise<EnforcementResult> {
        try {
            const tenant = await tenantRepository.getTenantById(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const plan = (tenant.plan || 'starter') as PlanId;
            const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
            const limit = action === 'freight_simulation'
                ? limits.freight_simulations_per_month
                : limits.whatsapp_outbound_per_month;

            const monthKey = this.getMonthKey();
            const usageStats = await this.getTenantUsage(tenantId, monthKey);
            const usage = action === 'freight_simulation'
                ? usageStats.freight_simulations_per_month
                : usageStats.whatsapp_outbound_per_month;

            const percentUsed = limit > 0 ? usage / limit : 0;

            let state: FinopsState = 'unlocked';
            if (percentUsed >= FINOPS_THRESHOLDS.locked_at) {
                state = 'locked';
            } else if (percentUsed >= FINOPS_THRESHOLDS.degraded_at) {
                state = 'degraded';
            } else if (percentUsed >= FINOPS_THRESHOLDS.preemptive_at) {
                state = 'degraded_preemptive';
            }

            const headers = {
                'x-finops-state': state,
                'x-usage-percent': (percentUsed * 100).toFixed(1)
            };

            if (state === 'locked' || state === 'degraded') {
                // Enforce hard block at degraded (1.0)
                return { allowed: false, state, percentUsed, headers };
            }

            return { allowed: true, state, percentUsed, headers };

        } catch (err) {
            logger.error('Failed to enforce plan limit (fail-open)', err as Error, { tenantId, action });
            return { allowed: true, state: 'unlocked', percentUsed: 0, headers: {} };
        }
    }

    async getPlanStatus(tenantId: string) {
        const tenant = await tenantRepository.getTenantById(tenantId);
        const plan = (tenant?.plan || 'starter') as PlanId;
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

        const monthKey = this.getMonthKey();
        const usage = await this.getTenantUsage(tenantId, monthKey);

        const pctFreight = limits.freight_simulations_per_month > 0
            ? usage.freight_simulations_per_month / limits.freight_simulations_per_month
            : 0;

        const pctWhatsapp = limits.whatsapp_outbound_per_month > 0
            ? usage.whatsapp_outbound_per_month / limits.whatsapp_outbound_per_month
            : 0;

        const maxPercent = Math.max(pctFreight, pctWhatsapp);

        let state: FinopsState = 'unlocked';
        if (maxPercent >= FINOPS_THRESHOLDS.locked_at) {
            state = 'locked';
        } else if (maxPercent >= FINOPS_THRESHOLDS.degraded_at) {
            state = 'degraded';
        } else if (maxPercent >= FINOPS_THRESHOLDS.preemptive_at) {
            state = 'degraded_preemptive';
        }

        return {
            plan,
            state,
            limits,
            usage,
            percentFreight: (pctFreight * 100).toFixed(1),
            percentWhatsapp: (pctWhatsapp * 100).toFixed(1),
            maxPercent: (maxPercent * 100).toFixed(1)
        };
    }

    async incrementAndEnforceSyncLimits(tenantId: string, filesToSyncCount: number): Promise<{ allowed: boolean, reason?: string }> {
        try {
            const tenant = await tenantRepository.getTenantById(tenantId);
            const plan = (tenant?.plan || 'starter') as PlanId;
            const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

            if (filesToSyncCount > limits.knowledge_max_files_per_sync) {
                return { allowed: false, reason: `Limite de arquivos por sync excedido (${limits.knowledge_max_files_per_sync})` };
            }

            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const cacheKey = `finops:syncs:${tenantId}:${today}`;

            let currentSyncs = 0;
            if (redisClient.isAvailable()) {
                const redis = redisClient.getRawClient();
                if (redis) {
                    currentSyncs = await redis.incr(cacheKey);
                    if (currentSyncs === 1) {
                        await redis.expire(cacheKey, 86400); // 24h
                    }
                }
            }

            if (currentSyncs > limits.knowledge_max_syncs_per_day) {
                return { allowed: false, reason: `Limite diário de sincronizações alcançado (${limits.knowledge_max_syncs_per_day})` };
            }

            return { allowed: true };
        } catch (err) {
            logger.error('Failed to enforce sync limits (fail-open)', err as Error, { tenantId });
            return { allowed: true };
        }
    }
}

export const planEnforcementService = new PlanEnforcementService();
