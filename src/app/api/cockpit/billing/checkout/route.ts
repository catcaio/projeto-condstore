export const dynamic = 'force-dynamic';

/**
 * POST /api/cockpit/billing/checkout
 * ─────────────────────────────────────────────────────────────────────────────
 * Cria uma Stripe Checkout Session e retorna { url } para redirect.
 * Auth: requireAdmin (tenant-level).
 *
 * Quando STRIPE_SECRET_KEY ausente ou NEXT_PUBLIC_STRIPE_ENABLED !== "1",
 * retorna 400 { error: "STRIPE_DISABLED" } — o FinOpsCard usa o fluxo manual.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { withIdempotency } from '@/lib/http/with-idempotency';
import { withReplayProtection } from '@/lib/http/with-replay-protection';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { structuredLogger } from '../../../../../infra/log/logger';
import { getStripe, isStripeEnabled, getPriceIdForPlan } from '../../../../../core/stripe/stripe-client';
import { getDb } from '../../../../../infra/db';
import { plans } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { withJsonBody } from '@/lib/http/with-json-body';
import { z } from 'zod';
import { withDistributedLock } from '@/lib/infra/distributed-lock';
import { billingLock } from '@/lib/infra/lock-keys';
import { LockAcquisitionError } from '@/lib/infra/errors';

const checkoutSchema = z.object({
    planId: z.string().min(1, 'planId is required')
}).catchall(z.any());

export const POST = withReplayProtection(withIdempotency(
    withJsonBody(
        { schema: checkoutSchema, maxBytes: 2 * 1024 * 1024 },
        async (request: NextRequest, ctx: any, body: z.infer<typeof checkoutSchema>) => {
            const requestId = makeRequestId(request);

            // ── Auth ─────────────────────────────────────────────────────────────────
            const auth = await requireAdmin(request, { requestId });
            if (!auth.ok) return auth.response;
            const { tenantId } = auth.session;

            // ── Stripe feature flag ───────────────────────────────────────────────────
            if (!isStripeEnabled()) {
                return NextResponse.json(
                    { ok: false, error: 'STRIPE_DISABLED', message: 'Stripe is not enabled on this instance.' },
                    { status: 400 },
                );
            }

            const planId = body.planId;

            // ── Resolve Stripe price ID ───────────────────────────────────────────────
            const priceId = getPriceIdForPlan(planId);
            if (!priceId) {
                return errorResponse(
                    ErrorCode.VALIDATION_ERROR, 400, requestId,
                    `Plan '${planId}' is not available for Stripe checkout (free plan or unknown).`,
                );
            }

            try {
                return await withDistributedLock(billingLock(tenantId), 300, async () => {
                    // ── Validate plan exists and is active ────────────────────────────────────
                    try {
                        const db = await getDb();
                        const planRows = await db.select().from(plans).where(eq(plans.id, planId));
                        if (planRows.length === 0 || !planRows[0].active) {
                            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Plan '${planId}' is inactive or not found.`);
                        }
                    } catch (err) {
                        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to load plan details.');
                    }

                    // ── Create Stripe Checkout session ────────────────────────────────────────
                    try {
                        const stripe = getStripe();
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3015';

                        const session = await stripe.checkout.sessions.create({
                            mode: 'subscription',
                            line_items: [{ price: priceId, quantity: 1 }],
                            success_url: `${appUrl}/cockpit?billing=success`,
                            cancel_url: `${appUrl}/cockpit?billing=cancel`,
                            metadata: { tenantId, planId },
                            allow_promotion_codes: true,
                        });

                        structuredLogger.info('stripe_checkout_session_created', {
                            requestId,
                            tenantId,
                            planId,
                            sessionId: session.id,
                            eventType: 'billing_checkout',
                        });

                        const response = NextResponse.json({ ok: true, url: session.url }, { status: 200 });
                        attachRequestIdHeader(response, requestId);
                        return response;

                    } catch (err) {
                        structuredLogger.error('stripe_checkout_creation_failed', {
                            requestId,
                            tenantId,
                            planId,
                            errorCode: ErrorCode.UNKNOWN,
                            error: err,
                            eventType: 'billing_checkout',
                        });
                        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to create Stripe checkout session.');
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
