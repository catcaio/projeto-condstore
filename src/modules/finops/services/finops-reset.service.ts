import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    tenantBudgets,
    finopsMonthlyResets,
    finopsLockEvents,
} from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { redisClient } from '@/infra/redis.client';
import { finopsCacheKey } from '@/modules/finops/cache-keys';

/**
 * Retorna o "reset month" formatado como YYYY-MM
 */
export function getCurrentResetMonth(now: Date): string {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Checa se the o mês virou baseado em uma timestamp passada de reset
 */
export function needsReset(lastBudgetResetAt: Date | null | undefined, now: Date): boolean {
    if (!lastBudgetResetAt) return true;
    const lastMonth = getCurrentResetMonth(lastBudgetResetAt);
    const currMonth = getCurrentResetMonth(now);
    return lastMonth !== currMonth;
}

/**
 * Executa reset idempotente:
 * a) Insere log em finops_monthly_resets
 * b) Zera currentMonthUsd/burnRatePerDay, dá unlock, incrementa revision
 * c) Fecha lock em aberto se existir
 * d) Invalida Redis
 */
export async function runMonthlyReset(
    tenantId: string,
    now: Date,
    currentMonthUsd: number,
    burnRatePerDay: number,
): Promise<void> {
    const resetMonth = getCurrentResetMonth(now);

    try {
        const db = await getDb();

        // Fazemos transação para manter atomicidade
        await db.transaction(async (tx) => {
            // Se já inseriu para este mês/tenant, cairá no catch (idempotência pelo unique index)
            await tx.insert(finopsMonthlyResets).values({
                id: randomUUID(),
                tenantId,
                resetMonth,
                prevCurrentMonthUsd: currentMonthUsd ? String(currentMonthUsd.toFixed(6)) : '0',
                prevBurnRatePerDay: burnRatePerDay > 0 ? String(burnRatePerDay.toFixed(6)) : null,
                performedAt: now,
            });

            // Update budget
            const budgetRows = await tx
                .select({ stateRevision: tenantBudgets.stateRevision })
                .from(tenantBudgets)
                .where(eq(tenantBudgets.tenantId, tenantId))
                ;

            const revision = budgetRows.length > 0 ? (budgetRows[0].stateRevision ?? 1) + 1 : 2;

            await tx.update(tenantBudgets)
                .set({
                    currentMonthUsd: '0',
                    burnRatePerDay: null,
                    lastBudgetResetAt: now,
                    currentLockState: 'unlocked',
                    stateRevision: revision,
                    updatedAt: now,
                })
                .where(eq(tenantBudgets.tenantId, tenantId));

            // Fecha locks abertos
            await tx.update(finopsLockEvents)
                .set({
                    resolvedAt: now,
                    resolutionType: 'manual_reset',
                })
                .where(
                    and(
                        eq(finopsLockEvents.tenantId, tenantId),
                        isNull(finopsLockEvents.resolvedAt)
                    )
                );
        });

        // Invalida cache de fato
        if (redisClient.isAvailable()) {
            // Purge UI cache
            await redisClient.set(finopsCacheKey(tenantId), null, 0);
            // Purge LLM proxy state cache, causing it to read the new DB state (+ revision) on next request
            await redisClient.set(`tenant:${tenantId}:state`, null, 0);
        }

        logger.info('finops_monthly_reset_performed', {
            tenantId,
            resetMonth,
        });
    } catch (err: any) {
        // Ignora ER_DUP_ENTRY que sinaliza que outra req já fez o reset.
        if (err.code === 'ER_DUP_ENTRY') {
            logger.info('finops_monthly_reset_skipped_duplicate', { tenantId, resetMonth });
            return;
        }

        logger.error('finops_monthly_reset_error', err as Error, { tenantId, resetMonth });
    }
}
