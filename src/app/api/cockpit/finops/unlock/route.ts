import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../infra/db';
import { tenantBudgets, finopsLockEvents } from '../../../../../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { errorResponse, ErrorCode } from '../../../../../infra/http/error-response';
import { logger } from '../../../../../infra/logger';
import { redisClient } from '../../../../../infra/redis.client';
import { finopsCacheKey } from '../../../../../infra/repositories/token-usage-events.repository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    try {
        const auth = await requireAdmin(request, { requestId });
        if (!auth.ok) return auth.response;
        const tenantId = auth.session.tenantId;

        const body = await request.json().catch(() => ({}));
        const newBudgetUsd = Number(body.newBudgetUsd);

        if (isNaN(newBudgetUsd) || newBudgetUsd <= 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Valor do novo orçamento inválido. Use um número maior que zero.');
        }

        const db = await getDb();

        // 1. Busca p/ incrementar revision
        const budgetRowRows = await db.select().from(tenantBudgets).where(eq(tenantBudgets.tenantId, tenantId)).limit(1);
        if (budgetRowRows.length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Tenant budget não encontrado.');
        }

        const nextRevision = (budgetRowRows[0].stateRevision ?? 1) + 1;

        // 2. Transação: Atualiza tenantBudgets
        await db.update(tenantBudgets)
            .set({
                monthlyBudgetUsd: String(newBudgetUsd),
                currentLockState: 'unlocked',
                stateRevision: nextRevision,
                updatedAt: new Date(),
            })
            .where(eq(tenantBudgets.tenantId, tenantId))
            .execute();

        // 3. Resolve eventos ativos de lock (resolução: upgrade)
        await db.update(finopsLockEvents)
            .set({
                resolvedAt: new Date(),
                resolutionType: 'upgrade'
            })
            .where(
                and(
                    eq(finopsLockEvents.tenantId, tenantId),
                    isNull(finopsLockEvents.resolvedAt)
                )
            )
            .execute();

        // 4. Invalidação de Cache
        if (redisClient.isAvailable()) {
            await redisClient.set(finopsCacheKey(tenantId), null, 0); // limpa Dashboard payload
            await redisClient.set(`tenant:${tenantId}:state`, null, 0); // invalida solver para carregar state novo (unlocked) do db
        }

        logger.info('finops_unlocked_via_upgrade', { tenantId, newBudgetUsd, nextRevision });

        const response = NextResponse.json({ success: true, newBudgetUsd, revision: nextRevision });
        attachRequestIdHeader(response, requestId);
        return response;

    } catch (err) {
        logger.error('finops_unlock_error', err as Error, { requestId });
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Erro ao desbloquear orçamento.');
    }
}
