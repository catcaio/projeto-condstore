export const runtime = 'nodejs';

/**
 * POST /api/webhook/stripe
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe Webhook handler com:
 *   1. Verificação de assinatura (STRIPE_WEBHOOK_SECRET)
 *   2. Idempotência via stripe_events (insert + UNIQUE → 200 early if duplicate)
 *   3. Eventos tratados:
 *      - checkout.session.completed → upgradeTenantPlan + salva stripe IDs
 *      - invoice.paid               → garante status=active na subscription
 *      - customer.subscription.deleted → cancela subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '../../../../core/stripe/stripe-client';
import { getDb } from '../../../../infra/db';
import { stripeEvents, tenantSubscriptions } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { upgradeTenantPlan, BillingServiceError } from '../../../../modules/billing/billing.service';
import { structuredLogger } from '../../../../infra/log/logger';

// ── Helpers ────────────────────────────────────────────────────────────────

function isDuplicateEntry(err: unknown): boolean {
    const e = err as { code?: string; message?: string };
    return e?.code === 'ER_DUP_ENTRY' || Boolean(e?.message?.includes('Duplicate entry'));
}

async function saveStripeEvent(eventId: string, type: string): Promise<boolean> {
    try {
        const db = await getDb();
        await db.insert(stripeEvents).values({
            id: eventId,
            receivedAt: new Date(),
            type,
        });
        return true; // inserted = first time
    } catch (err) {
        if (isDuplicateEntry(err)) return false; // already processed
        throw err;
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;

    if (!tenantId || !planId) {
        structuredLogger.warn('stripe_checkout_missing_metadata', {
            sessionId: session.id,
            eventType: 'stripe_webhook',
        });
        return;
    }

    // Upgrade via billing service (creates ledger, updates budget, resolves lock)
    await upgradeTenantPlan(tenantId, planId, `stripe:${session.id}`);

    // Save Stripe IDs into tenant_subscriptions
    const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    const stripeSubId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    if (stripeCustomerId || stripeSubId) {
        const db = await getDb();
        await db
            .update(tenantSubscriptions)
            .set({
                ...(stripeCustomerId ? { stripeCustomerId } : {}),
                ...(stripeSubId ? { stripeSubscriptionId: stripeSubId } : {}),
            })
            .where(
                and(
                    eq(tenantSubscriptions.tenantId, tenantId),
                    eq(tenantSubscriptions.status, 'active'),
                ),
            );
    }

    structuredLogger.info('stripe_checkout_completed_processed', {
        tenantId,
        planId,
        sessionId: session.id,
        eventType: 'stripe_webhook',
    });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Stripe SDK >=14 moved subscription to invoice.parent.subscription_details
    // For compatibility we access via any cast and check both paths.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = invoice as any;
    const stripeSubId: string | null =
        (typeof inv.subscription === 'string' ? inv.subscription : null) ??
        (typeof inv.subscription?.id === 'string' ? inv.subscription.id : null) ??
        (typeof inv.parent?.subscription_details?.subscription === 'string'
            ? inv.parent.subscription_details.subscription
            : null);

    if (!stripeSubId) return;

    const db = await getDb();
    await db
        .update(tenantSubscriptions)
        .set({ status: 'active', endedAt: null })
        .where(eq(tenantSubscriptions.stripeSubscriptionId, stripeSubId));

    structuredLogger.info('stripe_invoice_paid_processed', {
        stripeSubscriptionId: stripeSubId,
        eventType: 'stripe_webhook',
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const db = await getDb();
    await db
        .update(tenantSubscriptions)
        .set({ status: 'canceled', endedAt: new Date() })
        .where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));

    structuredLogger.info('stripe_subscription_deleted_processed', {
        stripeSubscriptionId: subscription.id,
        eventType: 'stripe_webhook',
    });
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    const sig = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        structuredLogger.error('stripe_webhook_secret_missing', {
            eventType: 'stripe_webhook',
            errorCode: 'CONFIGURATION_ERROR',
        });
        return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
    }

    if (!sig) {
        return NextResponse.json({ error: 'Missing Stripe-Signature header.' }, { status: 400 });
    }

    // ── Read raw body ─────────────────────────────────────────────────────────
    const rawBody = await request.text();

    // ── Verify signature ──────────────────────────────────────────────────────
    let event: Stripe.Event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        structuredLogger.warn('stripe_signature_invalid', {
            error: (err as Error).message,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }

    structuredLogger.info('stripe_webhook_received', {
        eventId: event.id,
        type: event.type,
        eventType: 'stripe_webhook',
    });

    // ── Idempotency guard ─────────────────────────────────────────────────────
    let savedNew: boolean;
    try {
        savedNew = await saveStripeEvent(event.id, event.type);
    } catch (err) {
        structuredLogger.error('stripe_event_save_failed', {
            eventId: event.id,
            type: event.type,
            error: err,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ error: 'Failed to record event.' }, { status: 500 });
    }

    if (!savedNew) {
        // Already processed — acknowledge without reprocessing
        structuredLogger.info('stripe_event_duplicate_skipped', {
            eventId: event.id,
            type: event.type,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // ── Dispatch ───────────────────────────────────────────────────────────────
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            default:
                // Acknowledged but not processed
                structuredLogger.info('stripe_event_unhandled', {
                    eventId: event.id,
                    type: event.type,
                    eventType: 'stripe_webhook',
                });
        }
    } catch (err) {
        // Processing failed AFTER we already saved stripe_events.
        // We log and return 200 to prevent Stripe retrying infinitely.
        // The event is marked as received but unprocessed — ops can replay manually.
        structuredLogger.error('stripe_event_processing_failed', {
            eventId: event.id,
            type: event.type,
            errorCode: err instanceof BillingServiceError ? err.code : 'UNKNOWN',
            error: err,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json(
            { received: true, error: 'Processing failed, event recorded for manual replay.' },
            { status: 200 },
        );
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
