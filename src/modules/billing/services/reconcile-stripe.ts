/**
 * reconcileSubscriptionFromStripe
 *
 * Helper puro que compara o estado local de uma subscription com 
 * o estado do Stripe e retorna se há necessidade de atualização.
 *
 * Regra de ouro: NUNCA reativar se endedAt != null localmente.
 */

import type Stripe from 'stripe';

export interface LocalSubscription {
    id: string;
    tenantId: string;
    status: string;          // active | past_due | canceled
    stripeSubscriptionId: string | null;
    endedAt: Date | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
}

export interface ReconcilePatch {
    status?: string;
    endedAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: Date | null;
}

export interface ReconcileResult {
    shouldUpdate: boolean;
    patch: ReconcilePatch;
    reason: string;
}

const STRIPE_TO_LOCAL_STATUS: Record<string, string> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    incomplete: 'past_due',
    canceled: 'canceled',
    incomplete_expired: 'canceled',
    paused: 'past_due',
};

export function reconcileSubscriptionFromStripe(
    local: LocalSubscription,
    stripeSub: Stripe.Subscription,
): ReconcileResult {
    // Rule: never reactivate if locally ended
    if (local.endedAt !== null) {
        const stripeStatus = stripeSub.status;
        if (stripeStatus !== 'canceled') {
            return { shouldUpdate: false, patch: {}, reason: 'drift_local_ended_stripe_active' };
        }
        // Both canceled — no-op
        return { shouldUpdate: false, patch: {}, reason: 'both_canceled' };
    }

    const resolvedStatus = STRIPE_TO_LOCAL_STATUS[stripeSub.status] ?? local.status;
    const cancelAtPeriodEnd = stripeSub.cancel_at_period_end ?? false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = stripeSub as any;
    const currentPeriodEnd = subAny.current_period_end
        ? new Date(subAny.current_period_end * 1000)
        : null;

    const patch: ReconcilePatch = {};
    let changed = false;

    // Status sync
    if (resolvedStatus !== local.status) {
        patch.status = resolvedStatus;
        changed = true;

        // If Stripe says canceled, set endedAt
        if (resolvedStatus === 'canceled' && local.endedAt === null) {
            patch.endedAt = new Date();
        }
    }

    // cancelAtPeriodEnd sync
    if (cancelAtPeriodEnd !== local.cancelAtPeriodEnd) {
        patch.cancelAtPeriodEnd = cancelAtPeriodEnd;
        changed = true;
    }

    // currentPeriodEnd sync
    if (currentPeriodEnd && (
        !local.currentPeriodEnd ||
        Math.abs(currentPeriodEnd.getTime() - local.currentPeriodEnd.getTime()) > 60_000
    )) {
        patch.currentPeriodEnd = currentPeriodEnd;
        changed = true;
    }

    const reason = changed
        ? `sync:${Object.keys(patch).join(',')}`
        : 'no_change';

    return { shouldUpdate: changed, patch, reason };
}
