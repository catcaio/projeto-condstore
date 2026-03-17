export const dynamic = 'force-dynamic';

/**
 * POST /api/cockpit/billing/upgrade
 * ─────────────────────────────────────────────────────────────────────────────
 * Upgrade do plano do tenant. Auth: admin (tenant-level).
 *
 * Body: { "planId": "plan_pro" }
 *
 * Response:
 * { "status": "upgraded", "newBudget": 500, "plan": "Pro", "planId": "plan_pro" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { withIdempotency } from '@/lib/http/with-idempotency';
import { withReplayProtection } from '@/lib/http/with-replay-protection';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';
import {
    upgradeTenantPlan,
    getActivePlans,
    BillingServiceError,
} from '@/modules/billing';
import { withJsonBody } from '@/lib/http/with-json-body';
import { z } from 'zod';
import { withDistributedLock } from '@/lib/infra/distributed-lock';
import { billingLock } from '@/lib/infra/lock-keys';
import { LockAcquisitionError } from '@/lib/infra/errors';

const upgradeSchema = z.object({
    planId: z.string().min(1, 'planId is required')
}).catchall(z.any());

export const POST = withReplayProtection(withIdempotency(
    withJsonBody(
        { schema: upgradeSchema, maxBytes: 2 * 1024 * 1024 },
        async (request: NextRequest, ctx: any, body: z.infer<typeof upgradeSchema>) => {
            const requestId = makeRequestId(request);

            structuredLogger.info('billing_upgrade_request', {
                requestId,
                route: '/api/cockpit/billing/upgrade',
                eventType: 'billing_upgrade',
            });

            // ── Auth ─────────────────────────────────────────────────────────────────
            const auth = await requireAdmin(request, { requestId });
            if (!auth.ok) return auth.response;
            const { tenantId } = auth.session;

            const planId = body.planId;

            // ── Execute upgrade ───────────────────────────────────────────────────────
            try {
                return await withDistributedLock(billingLock(tenantId), 300, async () => {
                    try {
                        const result = await upgradeTenantPlan(tenantId, planId, requestId);

                        structuredLogger.info('billing_upgrade_success', {
                            requestId,
                            tenantId,
                            planId: result.planId,
                            newBudget: result.newBudget,
                            eventType: 'billing_upgrade',
                        });

                        const response = NextResponse.json({
                            status: result.status,
                            plan: result.plan,
                            planId: result.planId,
                            newBudget: result.newBudget,
                            softLimitPercent: result.softLimitPercent,
                            hardLimitPercent: result.hardLimitPercent,
                        }, { status: 200 });

                        attachRequestIdHeader(response, requestId);
                        return response;

                    } catch (err) {
                        if (err instanceof BillingServiceError) {
                            const status = err.code === 'PLAN_NOT_FOUND' || err.code === 'PLAN_INACTIVE' ? 400 : 422;
                            return errorResponse(ErrorCode.VALIDATION_ERROR, status, requestId, err.message);
                        }

                        structuredLogger.error('billing_upgrade_error', {
                            requestId,
                            tenantId,
                            planId,
                            eventType: 'billing_upgrade',
                            errorCode: ErrorCode.UNKNOWN,
                            error: err,
                        });

                        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Upgrade failed. Please try again.');
                    }
                });
            } catch (err) {
                if (err instanceof LockAcquisitionError) {
                    return errorResponse(ErrorCode.LOCK_BUSY, 423, requestId, 'Billing operation in progress. Please try again in a moment.');
                }
                throw err;
            }
        }
    )
));

/**
 * GET /api/cockpit/billing/upgrade
 * Returns available plans for the upgrade selector UI.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const availablePlans = await getActivePlans();
        const response = NextResponse.json({
            ok: true,
            plans: availablePlans.map((p) => ({
                id: p.id,
                name: p.name,
                monthlyPriceUsd: Number(p.monthlyPriceUsd),
                monthlyBudgetUsd: Number(p.monthlyBudgetUsd),
            })),
        }, { status: 200 });
        attachRequestIdHeader(response, requestId);
        return response;
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to load plans');
    }
}
