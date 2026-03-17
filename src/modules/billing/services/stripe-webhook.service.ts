import type Stripe from 'stripe';
import { getDb } from '@/infra/db';
import { tenantSubscriptions } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { upgradeTenantPlan, BillingServiceError } from './billing.service';
import { structuredLogger } from '@/infra/log/logger';
import { getPlanIdFromPriceId, getPriceWhitelist } from '@/core/stripe/stripe-client';

export interface HandlerResult {
    processed: boolean;
    ignored: boolean;
    reason?: string;
}

const IGNORED = (reason: string): HandlerResult => ({ processed: false, ignored: true, reason });
const PROCESSED = (): HandlerResult => ({ processed: true, ignored: false });

function extractPriceIdFromSession(session: Stripe.Checkout.Session): string | null {
    if (session.metadata?.priceId) return session.metadata.priceId;

    const planId = session.metadata?.planId;
    if (planId) {
        const whitelist = getPriceWhitelist();
        const envMap: Record<string, string | undefined> = {
            plan_growth: process.env.STRIPE_PRICE_GROWTH,
            plan_pro: process.env.STRIPE_PRICE_PRO,
            plan_scale: process.env.STRIPE_PRICE_SCALE,
        };
        const priceId = envMap[planId];
        if (priceId && whitelist.has(priceId)) return priceId;
    }
    return null;
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<HandlerResult> {
    if (session.mode !== 'subscription') {
        structuredLogger.info('stripe_checkout_wrong_mode', { sessionId: session.id, mode: session.mode, eventType: 'stripe_webhook' });
        return IGNORED('mode_not_subscription');
    }

    if (session.payment_status !== 'paid') {
        structuredLogger.info('stripe_checkout_not_paid', { sessionId: session.id, paymentStatus: session.payment_status, eventType: 'stripe_webhook' });
        return IGNORED('payment_not_paid');
    }

    const priceId = extractPriceIdFromSession(session);
    const whitelist = getPriceWhitelist();

    if (!priceId || !whitelist.has(priceId)) {
        structuredLogger.warn('stripe_checkout_unknown_price', { sessionId: session.id, priceId: priceId ?? 'null', eventType: 'stripe_webhook' });
        return IGNORED('unknown_price');
    }

    const resolvedPlanId = getPlanIdFromPriceId(priceId);
    if (!resolvedPlanId) return IGNORED('unknown_price');

    const tenantId = session.metadata?.tenantId ?? (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);

    if (!tenantId || tenantId.trim().length === 0) {
        structuredLogger.warn('stripe_checkout_missing_tenant', { sessionId: session.id, eventType: 'stripe_webhook', binding_status: 'unbound' });
        return IGNORED('missing_tenant_binding');
    }

    await upgradeTenantPlan(tenantId, resolvedPlanId, `stripe:${session.id}`);

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer as Stripe.Customer | null)?.id ?? null;
    const stripeSubId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as Stripe.Subscription | null)?.id ?? null;

    if (stripeCustomerId || stripeSubId) {
        const db = await getDb();
        await db.update(tenantSubscriptions)
            .set({ ...(stripeCustomerId ? { stripeCustomerId } : {}), ...(stripeSubId ? { stripeSubscriptionId: stripeSubId } : {}) })
            .where(and(eq(tenantSubscriptions.tenantId, tenantId), eq(tenantSubscriptions.status, 'active')));
    }

    structuredLogger.info('stripe_checkout_completed_processed', { tenantId, planId: resolvedPlanId, priceId, sessionId: session.id, eventType: 'stripe_webhook' });
    return PROCESSED();
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<HandlerResult> {
    const inv = invoice as any;
    const invoiceSubId: string | null =
        (typeof inv.subscription === 'string' ? inv.subscription : null) ??
        (typeof inv.subscription?.id === 'string' ? inv.subscription.id : null) ??
        (typeof inv.parent?.subscription_details?.subscription === 'string' ? inv.parent.subscription_details.subscription : null);

    if (!invoiceSubId) return IGNORED('no_subscription_id');

    const db = await getDb();
    const rows = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId));
    const sub = rows[0] ?? null;

    if (!sub) {
        structuredLogger.warn('stripe_invoice_no_matching_subscription', { invoiceSubId, eventType: 'stripe_webhook' });
        return IGNORED('no_matching_subscription');
    }

    if (sub.stripeSubscriptionId !== invoiceSubId) return IGNORED('subscription_id_mismatch');

    if (sub.status === 'canceled' || sub.endedAt !== null) {
        structuredLogger.info('stripe_invoice_paid_skipped_canceled', { tenantId: sub.tenantId, stripeSubscriptionId: invoiceSubId, status: sub.status, endedAt: sub.endedAt, eventType: 'stripe_webhook' });
        return IGNORED('already_canceled');
    }

    await db.update(tenantSubscriptions).set({ status: 'active', endedAt: null })
        .where(and(eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId), eq(tenantSubscriptions.status, 'past_due')));

    structuredLogger.info('stripe_invoice_paid_processed', { tenantId: sub.tenantId, stripeSubscriptionId: invoiceSubId, eventType: 'stripe_webhook' });
    return PROCESSED();
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<HandlerResult> {
    const db = await getDb();
    const rows = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));
    const sub = rows[0] ?? null;

    if (!sub) {
        structuredLogger.warn('stripe_sub_deleted_no_match', { stripeSubscriptionId: subscription.id, eventType: 'stripe_webhook' });
        return IGNORED('no_matching_subscription');
    }

    if (sub.status === 'canceled') {
        structuredLogger.info('stripe_sub_deleted_already_canceled', { tenantId: sub.tenantId, stripeSubscriptionId: subscription.id, eventType: 'stripe_webhook' });
        return IGNORED('already_canceled');
    }

    await db.update(tenantSubscriptions).set({ status: 'canceled', endedAt: new Date() }).where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));
    structuredLogger.info('stripe_subscription_deleted_processed', { tenantId: sub.tenantId, stripeSubscriptionId: subscription.id, eventType: 'stripe_webhook' });
    return PROCESSED();
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<HandlerResult> {
    const inv = invoice as any;
    const invoiceSubId: string | null =
        (typeof inv.subscription === 'string' ? inv.subscription : null) ??
        (typeof inv.subscription?.id === 'string' ? inv.subscription.id : null) ??
        (typeof inv.parent?.subscription_details?.subscription === 'string' ? inv.parent.subscription_details.subscription : null);

    if (!invoiceSubId) return IGNORED('no_subscription_id');

    const db = await getDb();
    const rows = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId));
    const sub = rows[0] ?? null;

    if (!sub) return IGNORED('no_matching_subscription');
    if (sub.status === 'canceled' || sub.endedAt !== null) return IGNORED('already_canceled');

    await db.update(tenantSubscriptions).set({ status: 'past_due', lastPaymentFailedAt: new Date() }).where(eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId));
    structuredLogger.info('stripe_invoice_payment_failed_processed', { tenantId: sub.tenantId, stripeSubscriptionId: invoiceSubId, eventType: 'stripe_webhook' });
    return PROCESSED();
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<HandlerResult> {
    const db = await getDb();
    const rows = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));
    const sub = rows[0] ?? null;

    if (!sub) return IGNORED('no_matching_subscription');
    if (sub.status === 'canceled' || sub.endedAt !== null) return IGNORED('already_canceled');

    const stripeStatus = subscription.status;
    let newStatus = sub.status;

    if (['past_due', 'unpaid', 'incomplete'].includes(stripeStatus)) {
        newStatus = 'past_due';
    } else if (['active', 'trialing'].includes(stripeStatus)) {
        newStatus = 'active';
    }

    const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
    const subAny = subscription as any;
    const currentPeriodEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null;

    await db.update(tenantSubscriptions)
        .set({ status: newStatus, cancelAtPeriodEnd, ...(currentPeriodEnd ? { currentPeriodEnd } : {}) })
        .where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));

    structuredLogger.info('stripe_subscription_updated_processed', { tenantId: sub.tenantId, stripeSubscriptionId: subscription.id, newStatus, cancelAtPeriodEnd, eventType: 'stripe_webhook' });
    return PROCESSED();
}

export async function processStripeEvent(event: Stripe.Event): Promise<HandlerResult> {
    switch (event.type) {
        case 'checkout.session.completed':
            return await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        case 'invoice.paid':
            return await handleInvoicePaid(event.data.object as Stripe.Invoice);
        case 'invoice.payment_failed':
            return await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        case 'customer.subscription.updated':
            return await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        case 'customer.subscription.deleted':
            return await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        default:
            structuredLogger.info('stripe_event_unhandled', { eventId: event.id, type: event.type, eventType: 'stripe_webhook' });
            return PROCESSED(); // Treated as processed so it doesn't fail
    }
}
