/**
 * TenantStateResolver — ADR 006 / 007 (v2: USD-based predictive budget)
 *
 * Lock state resolution priority:
 *   1. Redis cache (< 1 ms, zero blocking)
 *   2. DB snapshot (fallback when Redis miss/dead)
 *   3. fail-open unlocked (never throws — outage prevention)
 *
 * State derivation (DB authoritative):
 *   locked   : currentMonthUsd >= monthlyBudgetUsd * hardLimitPercent/100
 *                OR (legacy) tokensConsumed >= monthlyTokenLimit
 *   degraded : currentMonthUsd >= monthlyBudgetUsd * softLimitPercent/100
 *                OR (legacy) tokensConsumed >= monthlyTokenLimit * 0.80
 *   unlocked : otherwise
 *
 * monthlyBudgetUsd == 0  → USD enforcement disabled, token-only mode.
 *
 * state_revision is incremented every time the computed state differs from
 * the stored currentLockState; the Worker performs the authoritative UPDATE.
 * Here we compute the *effective* state without mutating (read path only).
 */

import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { tenantBudgets, finopsAlertEvents, finopsLockEvents } from '../../drizzle/schema';
import { redisClient } from '../../infra/redis.client';
import { logger } from '../../infra/logger';
import { finopsCacheKey } from '@/modules/finops/cache-keys';
import { computeProjectedDays } from '@/modules/finops/services/finops-budget.service';
import { needsReset, runMonthlyReset } from '@/modules/finops/services/finops-reset.service';
import { publishEvent } from '../events/event-bus';

export type TenantLockState = 'unlocked' | 'degraded' | 'degraded_preemptive' | 'locked';

export interface TenantBudgetSnapshot {
    status: TenantLockState;
    revision: number;
    tokensConsumed: number;
    monthlyTokenLimit: number;
    /** USD spend this calendar month */
    currentMonthUsd: number;
    /** Monthly USD cap (0 = disabled) */
    monthlyBudgetUsd: number;
    /** Burn rate in USD/day */
    burnRatePerDay: number;
}

export interface ResolvedTenantState {
    state: TenantLockState;
    revision: number;
    /** 'redis' | 'db' | 'fallback' — source of truth for this decision */
    source: 'redis' | 'db' | 'fallback';
}

const REDIS_STATE_TTL_SECONDS = 90;

function redisKey(tenantId: string): string {
    return `tenant:${tenantId}:state`;
}

// ─── Pure state derivation ────────────────────────────────────────────────────

/**
 * Determines lock state from raw budget numbers.
 * Pure function — no I/O, fully testable.
 */
export function deriveStateFromBudget(budget: {
    monthlyBudgetUsd: number;
    softLimitPercent: number;
    hardLimitPercent: number;
    currentMonthUsd: number;
    burnRatePerDay: number;
    monthlyTokenLimit: number;
    tokensConsumed: number;
}): TenantLockState {
    const {
        monthlyBudgetUsd, softLimitPercent, hardLimitPercent,
        currentMonthUsd, burnRatePerDay, monthlyTokenLimit, tokensConsumed,
    } = budget;

    const usdEnforced = monthlyBudgetUsd > 0;

    if (usdEnforced) {
        const hardCap = monthlyBudgetUsd * (hardLimitPercent / 100);
        const softCap = monthlyBudgetUsd * (softLimitPercent / 100);

        if (currentMonthUsd >= hardCap) return 'locked';
        if (currentMonthUsd >= softCap) return 'degraded';

        const remaining = hardCap - currentMonthUsd;
        const projectedDaysToHardLimit = burnRatePerDay > 0 ? remaining / burnRatePerDay : null;

        if (projectedDaysToHardLimit !== null && projectedDaysToHardLimit <= 3) {
            return 'degraded_preemptive';
        }

        return 'unlocked';
    }

    // Token-only fallback (legacy / tenants without USD budget)
    if (tokensConsumed >= monthlyTokenLimit) return 'locked';
    if (tokensConsumed >= Math.floor(monthlyTokenLimit * 0.8)) return 'degraded';
    return 'unlocked';
}

// ─── Main resolver ────────────────────────────────────────────────────────────

/**
 * Resolve the current lock state for a tenant.
 * Never throws. Falls back to 'unlocked' on total failure (fail-open strategy).
 */
export async function getTenantState(tenantId: string): Promise<ResolvedTenantState> {
    // ── 1. Fast path: Redis ──────────────────────────────────────────────────────
    try {
        const cached = await redisClient.get<TenantBudgetSnapshot>(redisKey(tenantId));
        if (cached && cached.status && typeof cached.revision === 'number') {
            return { state: cached.status, revision: cached.revision, source: 'redis' };
        }
    } catch (err) {
        logger.warn('tenant_state_redis_miss', {
            tenantId,
            reason: 'redis_error',
            error: (err as Error).message,
        });
    }

    // ── 2. Slow path: DB ─────────────────────────────────────────────────────────
    try {
        const db = await getDb();
        const rows = await db
            .select()
            .from(tenantBudgets)
            .where(eq(tenantBudgets.tenantId, tenantId))
            ;

        if (rows.length === 0) {
            return { state: 'unlocked', revision: 0, source: 'db' };
        }

        const row = rows[0];
        const now = new Date();

        // ── Automação Monthly Reset (ADR)
        if (needsReset(row.lastBudgetResetAt, now)) {
            const reqId = randomUUID();
            publishEvent({
                stream: 'events:finops',
                type: 'FINOPS_MONTHLY_RESET',
                tenantId,
                requestId: reqId,
                data: {
                    monthStr: `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`,
                    currentMonthUsd: Number(row.currentMonthUsd ?? 0),
                    burnRatePerDay: Number(row.burnRatePerDay ?? 0),
                    timestamp: now.toISOString()
                }
            }).catch(() => {
                logger.warn('publish_event_failed_running_inline_reset', { tenantId, requestId: reqId });
                // Fallback fire-and-forget if Redis is unavailable
                void runMonthlyReset(
                    tenantId,
                    now,
                    Number(row.currentMonthUsd ?? 0),
                    Number(row.burnRatePerDay ?? 0)
                ).catch(() => { /* silent */ });
            });
        }

        const state = deriveStateFromBudget({
            monthlyBudgetUsd: Number(row.monthlyBudgetUsd ?? 0),
            softLimitPercent: row.softLimitPercent ?? 80,
            hardLimitPercent: row.hardLimitPercent ?? 100,
            currentMonthUsd: Number(row.currentMonthUsd ?? 0),
            burnRatePerDay: Number(row.burnRatePerDay ?? 0),
            monthlyTokenLimit: row.monthlyTokenLimit,
            tokensConsumed: row.tokensConsumed ?? 0,
        });

        let revision = row.stateRevision ?? 1;
        const prevState = row.currentLockState as TenantLockState;

        if (prevState === 'unlocked' && state === 'degraded_preemptive') {
            revision += 1;
            // Fire-and-forget DB update to persist preemptive mode and bump revision
            db.update(tenantBudgets)
                .set({ currentLockState: 'degraded_preemptive', stateRevision: revision })
                .where(eq(tenantBudgets.tenantId, tenantId))
                .execute()
                .catch((e: Error) => logger.warn('preemptive_degrade_db_update_failed', { tenantId, err: e.message }));
        }

        // FinOps Alerts logic
        if (prevState !== state && state !== 'unlocked') {
            const reqId = randomUUID();
            const metrics = {
                projectedDaysToHardLimit: computeProjectedDays(
                    Number(row.monthlyBudgetUsd ?? 0),
                    row.hardLimitPercent ?? 100,
                    Number(row.currentMonthUsd ?? 0),
                    Number(row.burnRatePerDay ?? 0),
                ),
                currentMonthUsd: Number(row.currentMonthUsd ?? 0),
                monthlyBudgetUsd: Number(row.monthlyBudgetUsd ?? 0),
                burnRatePerDay: Number(row.burnRatePerDay ?? 0)
            };
            publishEvent({
                stream: 'events:finops',
                type: 'FINOPS_ALERT_TRANSITION',
                tenantId,
                requestId: reqId,
                data: { prevState, nextState: state, metrics }
            }).catch(() => {
                logger.warn('publish_event_failed_running_inline_alert', { tenantId, requestId: reqId });
                void fireFinOpsAlert(tenantId, prevState, state, metrics).catch(() => { /* non-critical */ });
            });
        }

        if (state === 'locked' && prevState !== 'locked') {
            const reqId = randomUUID();
            const metrics = {
                currentMonthUsd: Number(row.currentMonthUsd ?? 0),
                monthlyBudgetUsd: Number(row.monthlyBudgetUsd ?? 0),
                burnRatePerDay: Number(row.burnRatePerDay ?? 0)
            };
            publishEvent({
                stream: 'events:finops',
                type: 'FINOPS_LOCK_TRANSITION',
                tenantId,
                requestId: reqId,
                data: { lockedAt: new Date().toISOString(), snapshot: metrics }
            }).catch(() => {
                logger.warn('publish_event_failed_running_inline_lock', { tenantId, requestId: reqId });
                void fireFinOpsLockEvent(
                    tenantId,
                    metrics.currentMonthUsd,
                    metrics.monthlyBudgetUsd,
                    metrics.burnRatePerDay
                ).catch(() => { /* non-critical */ });
            });
        }

        const snapshot: TenantBudgetSnapshot = {
            status: state,
            revision,
            tokensConsumed: row.tokensConsumed ?? 0,
            monthlyTokenLimit: row.monthlyTokenLimit,
            currentMonthUsd: Number(row.currentMonthUsd ?? 0),
            monthlyBudgetUsd: Number(row.monthlyBudgetUsd ?? 0),
            burnRatePerDay: Number(row.burnRatePerDay ?? 0),
        };

        void publishToRedisIfNewer(tenantId, snapshot);

        logger.info('tenant_state_db_fallback', {
            tenantId, state, revision,
            currentMonthUsd: snapshot.currentMonthUsd,
            monthlyBudgetUsd: snapshot.monthlyBudgetUsd,
            burnRatePerDay: snapshot.burnRatePerDay,
        });

        return { state, revision, source: 'db' };
    } catch (err) {
        logger.error('tenant_state_db_error', err as Error, {
            tenantId,
            reason: 'db_error',
        });
    }

    // ── 3. Total failure: fail-open ───────────────────────────────────────────────
    logger.warn('tenant_state_fail_open', { tenantId });
    return { state: 'unlocked', revision: 0, source: 'fallback' };
}

// ─── Redis publish helper ─────────────────────────────────────────────────────

async function publishToRedisIfNewer(
    tenantId: string,
    snapshot: TenantBudgetSnapshot,
): Promise<void> {
    try {
        const existing = await redisClient.get<TenantBudgetSnapshot>(redisKey(tenantId));
        const existingRevision = existing?.revision ?? 0;

        if (snapshot.revision > existingRevision) {
            await redisClient.set(redisKey(tenantId), snapshot, REDIS_STATE_TTL_SECONDS);
            logger.info('tenant_state_redis_healed', {
                tenantId,
                revision: snapshot.revision,
                status: snapshot.status,
            });
        }
    } catch {
        // Fire-and-forget: Redis offline is fine, DB is source of truth
    }
}

// ─── FinOps Alert Helper ────────────────────────────────────────────────────────

export async function fireFinOpsAlert(
    tenantId: string,
    prevState: string,
    nextState: string,
    metrics: { projectedDaysToHardLimit: number | null, currentMonthUsd: number, monthlyBudgetUsd: number, burnRatePerDay: number }
): Promise<void> {
    const rateLimitKey = `finops:alerted:${tenantId}:${nextState}`;

    try {
        // Fast path: rate-limiting via Redis
        if (redisClient.isAvailable()) {
            const alreadyAlerted = await redisClient.get(rateLimitKey);
            if (alreadyAlerted) return;
        }

        // Inserção no DB
        const db = await getDb();
        const reason = nextState === 'degraded_preemptive' ? 'preemptive_3d' :
            nextState === 'degraded' ? 'soft_limit' : 'hard_limit';

        await db.insert(finopsAlertEvents).values({
            id: randomUUID(),
            tenantId,
            prevState,
            nextState,
            reason,
            projectedDaysToHardLimit: metrics.projectedDaysToHardLimit !== null ? String(metrics.projectedDaysToHardLimit.toFixed(2)) : null,
            currentMonthUsd: String(metrics.currentMonthUsd.toFixed(6)),
            monthlyBudgetUsd: String(metrics.monthlyBudgetUsd.toFixed(6)),
            burnRatePerDay: metrics.burnRatePerDay > 0 ? String(metrics.burnRatePerDay.toFixed(6)) : null,
            createdAt: new Date(),
        });

        // Set rate limit for 6 hours
        if (redisClient.isAvailable()) {
            await redisClient.set(rateLimitKey, '1', 6 * 60 * 60);
        }

        // Invalidate cockpit FINOPS cache
        if (redisClient.isAvailable()) {
            await redisClient.set(finopsCacheKey(tenantId), null, 0);
        }

        logger.info('finops_alert_created', {
            tenantId, prevState, nextState, reason
        });
    } catch (err) {
        logger.error('finops_alert_failed', err as Error, { tenantId, nextState });
    }
}

// ─── FinOps Lock Trigger Helper ─────────────────────────────────────────────────

export async function fireFinOpsLockEvent(
    tenantId: string,
    currentMonthUsd: number,
    monthlyBudgetUsd: number,
    burnRatePerDay: number,
): Promise<void> {
    try {
        const db = await getDb();
        const existing = await db
            .select({ id: finopsLockEvents.id })
            .from(finopsLockEvents)
            .where(
                and(
                    eq(finopsLockEvents.tenantId, tenantId),
                    isNull(finopsLockEvents.resolvedAt)
                )
            )
            ;

        if (existing.length === 0) {
            await db.insert(finopsLockEvents).values({
                id: randomUUID(),
                tenantId,
                currentMonthUsd: String(currentMonthUsd.toFixed(6)),
                monthlyBudgetUsd: String(monthlyBudgetUsd.toFixed(6)),
                burnRatePerDay: burnRatePerDay > 0 ? String(burnRatePerDay.toFixed(6)) : null,
                lockedAt: new Date(),
            });
            logger.info('finops_lock_event_created', { tenantId });
        }
    } catch (err) {
        logger.error('finops_lock_event_error', err as Error, { tenantId });
    }
}
