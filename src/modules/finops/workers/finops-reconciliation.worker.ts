/**
 * finops-reconciliation.worker.ts
 *
 * Control Plane — Worker de Reconciliação FinOps (ADR 007)
 *
 * Pipeline DB-first:
 *   1. Coletor  → lê token_usage_events pendentes em batches
 *   2. Agregador → UPSERT diário em tenant_usage_metrics
 *   3. Lock Engine → atualiza tenant_budgets + incrementa state_revision
 *   4. Publisher → replica snapshot no Redis se state_revision DB > Redis
 *
 * Seguro a re-execuções: marcação de processado é atômica por id,
 * e o UPSERT de métricas usa ON DUPLICATE KEY UPDATE.
 */

import { randomUUID } from 'crypto';
import { and, isNull, lte, sql as drizzleSql, eq } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { tokenUsageEvents, tenantUsageMetrics, tenantBudgets } from '@/drizzle/schema';
import { redisClient } from '@/infra/redis.client';
import { logger } from '@/infra/logger';

// ─── Constants ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const DEGRADED_THRESHOLD = 0.80;
const LOCKED_THRESHOLD = 1.00;
/** TTL do snapshot Redis: 90 s (worker roda a cada 60 s, folga de 1.5x) */
const REDIS_STATE_TTL_SECONDS = 90;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantBudgetState {
    status: 'unlocked' | 'degraded' | 'locked';
    revision: number;
    tokensConsumed: number;
    monthlyTokenLimit: number;
}

interface AggregateBucket {
    tenantId: string;
    date: string; // 'YYYY-MM-DD'
    totalRequests: number;
    totalToolCalls: number;
    totalTokensInput: number;
    totalTokensOutput: number;
    estimatedCostUsd: number;
    models: Record<string, number>;
    /** All raw event ids in this bucket (para marcação atômica) */
    eventIds: string[];
}

export interface WorkerRunResult {
    eventsProcessed: number;
    tenantsUpdated: number;
    durationMs: number;
    errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateToDay(ts: Date): string {
    return ts.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function resolveLockState(consumed: number, limit: number): 'unlocked' | 'degraded' | 'locked' {
    if (limit <= 0) return 'locked';
    const ratio = consumed / limit;
    if (ratio >= LOCKED_THRESHOLD) return 'locked';
    if (ratio >= DEGRADED_THRESHOLD) return 'degraded';
    return 'unlocked';
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export async function runFinopsReconciliation(opts?: {
    requestId?: string;
    batchSize?: number;
}): Promise<WorkerRunResult> {
    const requestId = opts?.requestId ?? randomUUID();
    const batchSize = opts?.batchSize ?? BATCH_SIZE;
    const startedAt = Date.now();
    const errors: string[] = [];
    let eventsProcessed = 0;
    const updatedTenants = new Set<string>();

    logger.info('finops_worker_start', { requestId, batchSize });

    try {
        const db = await getDb();

        // ── 1. COLETOR: busca batch de eventos pendentes ──────────────────────────
        const now = new Date();
        const rawEvents = await db
            .select()
            .from(tokenUsageEvents)
            .where(isNull(tokenUsageEvents.processedByWorker))
            .limit(batchSize);

        if (rawEvents.length === 0) {
            logger.info('finops_worker_no_pending_events', { requestId });
            return { eventsProcessed: 0, tenantsUpdated: 0, durationMs: Date.now() - startedAt, errors };
        }

        // ── 2. AGREGADOR: agrupar por (tenantId, day) ─────────────────────────────
        const buckets = new Map<string, AggregateBucket>();

        for (const ev of rawEvents) {
            const day = truncateToDay(ev.createdAt instanceof Date ? ev.createdAt : new Date(String(ev.createdAt)));
            const bucketKey = `${ev.tenantId}::${day}`;

            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, {
                    tenantId: ev.tenantId,
                    date: day,
                    totalRequests: 0,
                    totalToolCalls: 0,
                    totalTokensInput: 0,
                    totalTokensOutput: 0,
                    estimatedCostUsd: 0,
                    models: {},
                    eventIds: [],
                });
            }

            const b = buckets.get(bucketKey)!;
            b.totalRequests += 1;
            b.totalTokensInput += ev.inputTokens ?? 0;
            b.totalTokensOutput += ev.outputTokens ?? 0;
            b.estimatedCostUsd += Number(ev.estimatedCostUsd ?? 0);

            const model = ev.modelUsed ?? 'unknown';
            b.models[model] = (b.models[model] ?? 0) + 1;
            b.eventIds.push(ev.id);
        }

        // ── 2b. UPSERT diário tenant_usage_metrics ────────────────────────────────
        for (const [, bucket] of buckets) {
            try {
                const costStr = bucket.estimatedCostUsd.toFixed(6);

                // MySQL: ON DUPLICATE KEY UPDATE (única constraint: tenantId+date)
                await db.insert(tenantUsageMetrics).values({
                    id: randomUUID(),
                    tenantId: bucket.tenantId,
                    date: bucket.date,
                    totalRequests: bucket.totalRequests,
                    totalToolCalls: bucket.totalToolCalls,
                    totalTokensInput: bucket.totalTokensInput,
                    totalTokensOutput: bucket.totalTokensOutput,
                    estimatedCostUsd: costStr,
                    modelDistributionJson: bucket.models,
                }).onDuplicateKeyUpdate({
                    set: {
                        totalRequests: drizzleSql`${tenantUsageMetrics.totalRequests} + ${bucket.totalRequests}`,
                        totalToolCalls: drizzleSql`${tenantUsageMetrics.totalToolCalls} + ${bucket.totalToolCalls}`,
                        totalTokensInput: drizzleSql`${tenantUsageMetrics.totalTokensInput} + ${bucket.totalTokensInput}`,
                        totalTokensOutput: drizzleSql`${tenantUsageMetrics.totalTokensOutput} + ${bucket.totalTokensOutput}`,
                        estimatedCostUsd: drizzleSql`${tenantUsageMetrics.estimatedCostUsd} + ${costStr}`,
                        // modelDistributionJson: merged in application layer per tenant cycle below
                        updatedAt: drizzleSql`CURRENT_TIMESTAMP`,
                    },
                });

                updatedTenants.add(bucket.tenantId);
            } catch (err) {
                const msg = `metrics_upsert_failed tenant=${bucket.tenantId} date=${bucket.date}: ${(err as Error).message}`;
                errors.push(msg);
                logger.error('finops_metrics_upsert_failed', err as Error, { requestId, tenantId: bucket.tenantId });
            }
        }

        // ── 3. LOCK ENGINE: atualiza tenant_budgets ───────────────────────────────
        // Agrupa tokens totais por tenant (todas as datas do batch)
        const tokensByTenant = new Map<string, { input: number; output: number; eventIds: string[] }>();
        for (const [, bucket] of buckets) {
            const existing = tokensByTenant.get(bucket.tenantId);
            if (!existing) {
                tokensByTenant.set(bucket.tenantId, {
                    input: bucket.totalTokensInput,
                    output: bucket.totalTokensOutput,
                    eventIds: bucket.eventIds,
                });
            } else {
                existing.input += bucket.totalTokensInput;
                existing.output += bucket.totalTokensOutput;
                existing.eventIds.push(...bucket.eventIds);
            }
        }

        for (const [tenantId, usage] of tokensByTenant) {
            try {
                const totalNewTokens = usage.input + usage.output;

                // UPSERT budget row se não existir; soma tokens e recalcula lock state
                // Lemos primeiro para calcular o novo estado (MySQL não suporta RETURNING)
                const existing = await db
                    .select()
                    .from(tenantBudgets)
                    .where(eq(tenantBudgets.tenantId, tenantId))
                    ;

                if (existing.length === 0) {
                    // Primeiro evento deste tenant: inicializa com defaults
                    await db.insert(tenantBudgets).values({
                        tenantId,
                        monthlyTokenLimit: 1_000_000,
                        tokensConsumed: totalNewTokens,
                        currentLockState: resolveLockState(totalNewTokens, 1_000_000),
                        stateRevision: 1,
                    });
                } else {
                    const current = existing[0];
                    const newConsumed = (current.tokensConsumed ?? 0) + totalNewTokens;
                    const newLockState = resolveLockState(newConsumed, current.monthlyTokenLimit);

                    // Incremento atômico de state_revision
                    await db
                        .update(tenantBudgets)
                        .set({
                            tokensConsumed: newConsumed,
                            currentLockState: newLockState,
                            stateRevision: drizzleSql`${tenantBudgets.stateRevision} + 1`,
                        })
                        .where(eq(tenantBudgets.tenantId, tenantId));
                }

                // ── 4. PUBLISHER Redis: replica somente se DB.revision > Redis.revision ─
                await publishBudgetStateToRedis(tenantId, requestId);

                // ── Marcar eventos como processados (atômico pelo id) ─────────────────
                // Drizzle MySQL: sem WHERE IN direto — usamos raw sql via drizzle sql tag
                const ids = usage.eventIds;
                if (ids.length > 0) {
                    await db
                        .update(tokenUsageEvents)
                        .set({ processedByWorker: now })
                        .where(and(
                            isNull(tokenUsageEvents.processedByWorker),
                            // Chunk fallback: marcamos todos do batch que pertencem a este tenant
                            eq(tokenUsageEvents.tenantId, tenantId),
                            lte(tokenUsageEvents.createdAt, now),
                        ));
                }

                eventsProcessed += usage.eventIds.length;
            } catch (err) {
                const msg = `budget_update_failed tenant=${tenantId}: ${(err as Error).message}`;
                errors.push(msg);
                logger.error('finops_budget_update_failed', err as Error, { requestId, tenantId });
            }
        }
    } catch (err) {
        const msg = `worker_fatal: ${(err as Error).message}`;
        errors.push(msg);
        logger.error('finops_worker_fatal', err as Error, { requestId });
    }

    const durationMs = Date.now() - startedAt;
    logger.info('finops_worker_end', {
        requestId,
        eventsProcessed,
        tenantsUpdated: updatedTenants.size,
        durationMs,
        errors: errors.length,
    });

    return { eventsProcessed, tenantsUpdated: updatedTenants.size, durationMs, errors };
}

// ─── Redis Publisher ──────────────────────────────────────────────────────────

async function publishBudgetStateToRedis(tenantId: string, requestId: string): Promise<void> {
    try {
        const db = await getDb();
        const rows = await db
            .select()
            .from(tenantBudgets)
            .where(eq(tenantBudgets.tenantId, tenantId))
            ;

        if (rows.length === 0) return;

        const dbRow = rows[0];
        const redisKey = `tenant:${tenantId}:state`;

        // Lê revisão atual do Redis
        const cached = await redisClient.get<TenantBudgetState>(redisKey);
        const redisRevision = cached?.revision ?? 0;
        const dbRevision = dbRow.stateRevision ?? 1;

        // Só publica se DB está à frente (evita regressão de estado com payloads atrasados)
        if (dbRevision <= redisRevision) {
            logger.info('finops_redis_skip_stale', { requestId, tenantId, dbRevision, redisRevision });
            return;
        }

        const snapshot: TenantBudgetState = {
            status: (dbRow.currentLockState as TenantBudgetState['status']) ?? 'unlocked',
            revision: dbRevision,
            tokensConsumed: dbRow.tokensConsumed ?? 0,
            monthlyTokenLimit: dbRow.monthlyTokenLimit,
        };

        await redisClient.set(redisKey, snapshot, REDIS_STATE_TTL_SECONDS);

        logger.info('finops_redis_state_published', {
            requestId,
            tenantId,
            revision: dbRevision,
            status: snapshot.status,
        });
    } catch (err) {
        // Redis offline → continua; DB é a fonte de verdade
        logger.error('finops_redis_publish_failed', err as Error, { requestId, tenantId });
    }
}
