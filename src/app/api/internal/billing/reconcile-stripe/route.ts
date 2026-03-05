export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/billing/reconcile-stripe
 *
 * "Break Glass" reconciliation endpoint.
 * Pulls current state from Stripe for each local subscription and
 * syncs status, cancelAtPeriodEnd and currentPeriodEnd.
 *
 * Protected by x-internal-token (same as /api/internal/diag).
 *
 * Body: { tenantId?: string, dryRun?: boolean, limit?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { getDb } from '../../../../../infra/db';
import { tenantSubscriptions } from '../../../../../drizzle/schema';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { withIdempotency } from '@/lib/http/with-idempotency';
import { withReplayProtection } from '@/lib/http/with-replay-protection';
import { getStripe } from '../../../../../core/stripe/stripe-client';
import { reconcileSubscriptionFromStripe, type LocalSubscription, type ReconcilePatch } from '../../../../../modules/billing/reconcile-stripe';
import { structuredLogger } from '../../../../../infra/log/logger';
import { makeRequestId, attachRequestIdHeader } from '../../../../../infra/http/request-trace';

interface ReconcileItem {
    tenantId: string;
    subscriptionId: string;
    before: string;
    after: string;
    action: string;
}

export const POST = withReplayProtection(withIdempotency(async (request: NextRequest): Promise<NextResponse> => {
    const requestId = makeRequestId();

    try {
        // ── Auth ──────────────────────────────────────────────────────────────────
        const authResult = requireInternalToken(request, { purpose: ['jobs', 'export', 'diag'] });
        if (!authResult.ok) {
            return attachRequestIdHeader(authResult.response, requestId);
        }

        // ── Parse body ────────────────────────────────────────────────────────────
        let body: { tenantId?: string; dryRun?: boolean; limit?: number } = {};
        try {
            body = await request.json();
        } catch {
            // empty body is fine — defaults apply
        }

        const dryRun = body.dryRun ?? false;
        const limit = Math.min(body.limit ?? 200, 500);

        structuredLogger.info('reconcile_stripe_started', {
            requestId,
            tenantId: body.tenantId ?? 'all',
            dryRun,
            limit,
        });

        // ── Load local subscriptions ──────────────────────────────────────────────
        const db = await getDb();
        let rows: any[];

        if (body.tenantId) {
            rows = await db
                .select()
                .from(tenantSubscriptions)
                .where(
                    and(
                        eq(tenantSubscriptions.tenantId, body.tenantId),
                        isNotNull(tenantSubscriptions.stripeSubscriptionId),
                    ),
                )
                .limit(limit);
        } else {
            rows = await db
                .select()
                .from(tenantSubscriptions)
                .where(
                    and(
                        isNotNull(tenantSubscriptions.stripeSubscriptionId),
                        inArray(tenantSubscriptions.status, ['active', 'past_due']),
                    ),
                )
                .limit(limit);
        }

        // ── Reconcile each ────────────────────────────────────────────────────────
        const stripe = getStripe();
        let processedCount = 0;
        let updatedCount = 0;
        let driftCount = 0;
        const items: ReconcileItem[] = [];

        for (const row of rows) {
            processedCount++;

            if (!row.stripeSubscriptionId) continue;

            let stripeSub;
            try {
                stripeSub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
            } catch (err: any) {
                structuredLogger.warn('reconcile_stripe_retrieve_failed', {
                    requestId,
                    tenantId: row.tenantId,
                    stripeSubscriptionId: row.stripeSubscriptionId,
                    error: err?.message,
                });
                continue;
            }

            const local: LocalSubscription = {
                id: row.id,
                tenantId: row.tenantId,
                status: row.status,
                stripeSubscriptionId: row.stripeSubscriptionId,
                endedAt: row.endedAt,
                cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
                currentPeriodEnd: row.currentPeriodEnd ?? null,
            };

            const result = reconcileSubscriptionFromStripe(local, stripeSub);

            if (result.reason.startsWith('drift')) {
                driftCount++;
            }

            if (result.shouldUpdate) {
                updatedCount++;

                if (!dryRun) {
                    await db
                        .update(tenantSubscriptions)
                        .set(result.patch as any)
                        .where(eq(tenantSubscriptions.id, row.id));
                }
            }

            if (items.length < 50) {
                items.push({
                    tenantId: row.tenantId,
                    subscriptionId: row.stripeSubscriptionId,
                    before: row.status,
                    after: result.patch.status ?? row.status,
                    action: result.shouldUpdate
                        ? (dryRun ? `dry_run:${result.reason}` : result.reason)
                        : result.reason,
                });
            }
        }

        structuredLogger.info('reconcile_stripe_finished', {
            requestId,
            processedCount,
            updatedCount,
            driftCount,
            dryRun,
        });

        return attachRequestIdHeader(
            NextResponse.json({
                processedCount,
                updatedCount,
                driftCount,
                dryRun,
                items,
            }),
            requestId,
        );
    } catch (error) {
        structuredLogger.error('[Billing Reconcile] Job failed', { error });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}));
