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
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';
import {
    upgradeTenantPlan,
    getActivePlans,
    BillingServiceError,
} from '../../../../../modules/billing/billing.service';

export const POST = withIdempotency(async (request: NextRequest): Promise<NextResponse> => {
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

    // ── Validate body ─────────────────────────────────────────────────────────
    let body: { planId?: unknown };
    try {
        body = await request.json();
    } catch {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
    }

    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
    if (!planId) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'planId is required');
    }

    // ── Execute upgrade ───────────────────────────────────────────────────────
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
