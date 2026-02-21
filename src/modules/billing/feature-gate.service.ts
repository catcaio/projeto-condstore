/**
 * FeatureGateService — Backend enforcement of per-plan usage limits.
 *
 * SECURITY: Plan is ALWAYS derived from the tenant DB record.
 * Never accept plan information from headers, cookies, or request body.
 *
 * Throws:
 *  - BusinessError(PLAN_LIMIT_EXCEEDED) → HTTP 429
 *  - BusinessError(FEATURE_DISABLED)    → HTTP 402
 */

import { getDb } from '../../infra/db';
import { tenants, simulations, messages } from '../../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../../infra/logger';
import { BusinessError, ErrorCode } from '../../infra/errors';
import { Plan, PLAN_LIMITS, parsePlan } from '../../lib/billing/plans';

export class FeatureGateService {
    /**
     * Get the resolved Plan for a tenant.
     * Throws if tenant not found.
     */
    async getTenantPlan(tenantId: string): Promise<Plan> {
        const db = await getDb();
        const rows = await db
            .select({ plan: tenants.plan })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);

        if (rows.length === 0) {
            logger.warn('FeatureGate: tenant not found, defaulting to FREE', { tenantId });
            return Plan.FREE;
        }

        return parsePlan(rows[0].plan);
    }

    /**
     * Assert the tenant has not exceeded their daily simulation limit.
     * Throws BusinessError(PLAN_LIMIT_EXCEEDED) if over the limit.
     */
    async assertWithinSimulationLimit(tenantId: string): Promise<void> {
        const plan = await this.getTenantPlan(tenantId);
        const limits = PLAN_LIMITS[plan];

        if (limits.maxSimulationsPerDay === Infinity) return;

        const db = await getDb();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [row] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(simulations)
            .where(
                and(
                    eq(simulations.tenantId, tenantId),
                    gte(simulations.createdAt, todayStart)
                )
            );

        const used = Number(row?.count ?? 0);

        logger.debug('FeatureGate: simulation limit check', {
            tenantId,
            plan,
            used,
            limit: limits.maxSimulationsPerDay,
        });

        if (used >= limits.maxSimulationsPerDay) {
            logger.warn('FeatureGate: simulation limit exceeded', {
                tenantId,
                plan,
                used,
                limit: limits.maxSimulationsPerDay,
            });
            throw new BusinessError(
                ErrorCode.PLAN_LIMIT_EXCEEDED,
                'Limite de simulações do plano atingido.',
                { tenantId, plan, used, limit: limits.maxSimulationsPerDay }
            );
        }
    }

    /**
     * Assert the tenant has not exceeded their monthly inbound message limit.
     * Throws BusinessError(PLAN_LIMIT_EXCEEDED) if over the limit.
     */
    async assertWithinMessageLimit(tenantId: string): Promise<void> {
        const plan = await this.getTenantPlan(tenantId);
        const limits = PLAN_LIMITS[plan];

        if (limits.maxMessagesPerMonth === Infinity) return;

        const db = await getDb();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [row] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(messages)
            .where(
                and(
                    eq(messages.tenantId, tenantId),
                    eq(messages.direction, 'inbound'),
                    gte(messages.createdAt, monthStart)
                )
            );

        const used = Number(row?.count ?? 0);

        logger.debug('FeatureGate: message limit check', {
            tenantId,
            plan,
            used,
            limit: limits.maxMessagesPerMonth,
        });

        if (used >= limits.maxMessagesPerMonth) {
            logger.warn('FeatureGate: message limit exceeded', {
                tenantId,
                plan,
                used,
                limit: limits.maxMessagesPerMonth,
            });
            throw new BusinessError(
                ErrorCode.PLAN_LIMIT_EXCEEDED,
                'Limite de mensagens do plano atingido.',
                { tenantId, plan, used, limit: limits.maxMessagesPerMonth }
            );
        }
    }

    /**
     * Assert a specific boolean feature is enabled for the tenant's plan.
     * Throws BusinessError(FEATURE_DISABLED) if not.
     */
    async assertFeatureEnabled(
        tenantId: string,
        featureKey: 'webhookAIEnabled'
    ): Promise<void> {
        const plan = await this.getTenantPlan(tenantId);
        const limits = PLAN_LIMITS[plan];
        const enabled = limits[featureKey];

        logger.debug('FeatureGate: feature check', { tenantId, plan, featureKey, enabled });

        if (!enabled) {
            logger.warn('FeatureGate: feature disabled for plan', { tenantId, plan, featureKey });
            throw new BusinessError(
                ErrorCode.FEATURE_DISABLED,
                `Funcionalidade ${featureKey} não disponível no plano ${plan}.`,
                { tenantId, plan, featureKey }
            );
        }
    }
}

export const featureGateService = new FeatureGateService();
