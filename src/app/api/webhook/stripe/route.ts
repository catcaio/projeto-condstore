export const runtime = 'nodejs';

/**
 * POST /api/webhook/stripe
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe Webhook handler — fully hardened:
 *
 *   LAYER 1 — Assinatura HMAC
 *   LAYER 2 — Idempotência DB atômica (INSERT UNIQUE)
 *   LAYER 3 — Gates de negócio por evento:
 *
 *   checkout.session.completed:
 *     • session.mode === "subscription"                   → gate
 *     • session.payment_status === "paid"                 → gate
 *     • priceId da line_item em whitelist de env vars     → gate
 *     • tenantId em metadata/client_reference_id          → gate
 *     • upgradeTenantPlan() só após todos os gates
 *     • salva stripe_customer_id + stripe_subscription_id
 *
 *   invoice.paid:
 *     • encontra subscription pelo stripe_subscription_id → gate
 *     • se subscription.status=canceled ou endedAt!=null  → NÃO reativa
 *     • se sub ID não bate com factura                    → ignored
 *     • só then: status=active (idempotente)
 *
 *   customer.subscription.deleted:
 *     • encontra subscription pelo stripe_subscription_id → gate
 *     • se já canceled: no-op
 *     • senão: status=canceled, endedAt=now()
 */

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getPlanIdFromPriceId, getPriceWhitelist } from '../../../../core/stripe/stripe-client';
import { getDb } from '../../../../infra/db';
import { stripeEvents, tenantSubscriptions } from '../../../../drizzle/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { upgradeTenantPlan, BillingServiceError } from '../../../../modules/billing/billing.service';
import { structuredLogger } from '../../../../infra/log/logger';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InsertResult {
    inserted: boolean;
    errorKind?: 'duplicate' | 'db_error';
    error?: unknown;
}

/** Resultado normalizado de um handler de evento */
interface HandlerResult {
    processed: boolean;
    ignored: boolean;
    reason?: string;
}

const IGNORED = (reason: string): HandlerResult => ({ processed: false, ignored: true, reason });
const PROCESSED = (): HandlerResult => ({ processed: true, ignored: false });

// ── Idempotency guard ──────────────────────────────────────────────────────────

function isDuplicateEntry(err: unknown): boolean {
    const e = err as { code?: string; message?: string };
    return e?.code === 'ER_DUP_ENTRY' || Boolean(e?.message?.includes('Duplicate entry'));
}

async function insertStripeEventOnce(
    stripeEventId: string,
    type: string,
    rawBody: string,
    stripeCreatedAt?: Date,
): Promise<InsertResult> {
    try {
        const db = await getDb();
        const payloadHash = createHash('sha256').update(rawBody).digest('hex').slice(0, 64);
        await db.insert(stripeEvents).values({
            id: stripeEventId,
            stripeEventId,
            receivedAt: new Date(),
            type,
            stripeCreatedAt: stripeCreatedAt ?? null,
            payloadHash,
        });
        return { inserted: true };
    } catch (err) {
        if (isDuplicateEntry(err)) return { inserted: false, errorKind: 'duplicate' };
        return { inserted: false, errorKind: 'db_error', error: err };
    }
}

// ── Helper: extract price ID from checkout session ────────────────────────────
// The priceId lives in session.line_items, which requires an API call.
// As an optimization, the server also encodes `planId` in metadata at checkout time
// so we can re-derive the priceId locally without an extra API round-trip.
// We also accept `priceId` directly in metadata as a belt-and-suspenders approach.

function extractPriceIdFromSession(session: Stripe.Checkout.Session): string | null {
    // Path 1: priceId stored directly in metadata (belt)
    if (session.metadata?.priceId) return session.metadata.priceId;

    // Path 2: derive from planId metadata + env map
    const planId = session.metadata?.planId;
    if (planId) {
        // Import-time resolution via stripe-client
        const whitelist = getPriceWhitelist();
        // Build reverse map planId→priceId inline
        const envMap: Record<string, string | undefined> = {
            plan_growth: process.env.STRIPE_PRICE_GROWTH,
            plan_pro: process.env.STRIPE_PRICE_PRO,
            plan_scale: process.env.STRIPE_PRICE_SCALE,
        };
        const priceId = envMap[planId];
        if (priceId && whitelist.has(priceId)) return priceId;
    }

    // Path 3: cannot resolve — caller will perform API lookup or gate
    return null;
}

// ── A. checkout.session.completed ─────────────────────────────────────────────

async function handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
): Promise<HandlerResult> {
    // ── Gate 1: session.mode must be "subscription" ──────────────────────────
    if (session.mode !== 'subscription') {
        structuredLogger.info('stripe_checkout_wrong_mode', {
            sessionId: session.id,
            mode: session.mode,
            eventType: 'stripe_webhook',
        });
        return IGNORED('mode_not_subscription');
    }

    // ── Gate 2: payment_status must be "paid" ────────────────────────────────
    if (session.payment_status !== 'paid') {
        structuredLogger.info('stripe_checkout_not_paid', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            eventType: 'stripe_webhook',
        });
        return IGNORED('payment_not_paid');
    }

    // ── Gate 3: resolve and whitelist-check priceId ───────────────────────────
    const priceId = extractPriceIdFromSession(session);
    const whitelist = getPriceWhitelist();

    if (!priceId || !whitelist.has(priceId)) {
        structuredLogger.warn('stripe_checkout_unknown_price', {
            sessionId: session.id,
            priceId: priceId ?? 'null',
            eventType: 'stripe_webhook',
        });
        return IGNORED('unknown_price');
    }

    // Derive internal planId from priceId
    const resolvedPlanId = getPlanIdFromPriceId(priceId);
    if (!resolvedPlanId) {
        return IGNORED('unknown_price');
    }

    // ── Gate 4: tenantId binding ──────────────────────────────────────────────
    const tenantId =
        session.metadata?.tenantId ??
        (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);

    if (!tenantId || tenantId.trim().length === 0) {
        structuredLogger.warn('stripe_checkout_missing_tenant', {
            sessionId: session.id,
            eventType: 'stripe_webhook',
        });
        return IGNORED('missing_tenant_binding');
    }

    // ── All gates passed → process ────────────────────────────────────────────
    await upgradeTenantPlan(tenantId, resolvedPlanId, `stripe:${session.id}`);

    // Persist Stripe IDs
    const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null;

    const stripeSubId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id ?? null;

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
        planId: resolvedPlanId,
        priceId,
        sessionId: session.id,
        eventType: 'stripe_webhook',
    });

    return PROCESSED();
}

// ── B. invoice.paid ───────────────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<HandlerResult> {
    // Stripe SDK >=14 compat: subscription can be in parent.subscription_details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = invoice as any;
    const invoiceSubId: string | null =
        (typeof inv.subscription === 'string' ? inv.subscription : null) ??
        (typeof inv.subscription?.id === 'string' ? inv.subscription.id : null) ??
        (typeof inv.parent?.subscription_details?.subscription === 'string'
            ? inv.parent.subscription_details.subscription
            : null);

    if (!invoiceSubId) {
        return IGNORED('no_subscription_id');
    }

    // ── Load current tenant subscription from DB ──────────────────────────────
    const db = await getDb();
    const rows = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId))
        .limit(1);

    const sub = rows[0] ?? null;

    // ── Gate: subscription binding must exist ─────────────────────────────────
    if (!sub) {
        structuredLogger.warn('stripe_invoice_no_matching_subscription', {
            invoiceSubId,
            eventType: 'stripe_webhook',
        });
        return IGNORED('no_matching_subscription');
    }

    // ── Gate: cross-check invoice.subscription === sub.stripeSubscriptionId ───
    if (sub.stripeSubscriptionId !== invoiceSubId) {
        return IGNORED('subscription_id_mismatch');
    }

    // ── Gate: do NOT reactivate a canceled subscription ───────────────────────
    if (sub.status === 'canceled' || sub.endedAt !== null) {
        structuredLogger.info('stripe_invoice_paid_skipped_canceled', {
            tenantId: sub.tenantId,
            stripeSubscriptionId: invoiceSubId,
            status: sub.status,
            endedAt: sub.endedAt,
            eventType: 'stripe_webhook',
        });
        return IGNORED('already_canceled');
    }

    // ── All gates passed → set active (idempotent) ───────────────────────────
    await db
        .update(tenantSubscriptions)
        .set({ status: 'active', endedAt: null })
        .where(
            and(
                eq(tenantSubscriptions.stripeSubscriptionId, invoiceSubId),
                eq(tenantSubscriptions.status, 'past_due'), // only escalate from past_due
            ),
        );

    structuredLogger.info('stripe_invoice_paid_processed', {
        tenantId: sub.tenantId,
        stripeSubscriptionId: invoiceSubId,
        eventType: 'stripe_webhook',
    });

    return PROCESSED();
}

// ── C. customer.subscription.deleted ──────────────────────────────────────────

async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
): Promise<HandlerResult> {
    const db = await getDb();

    // Load current record
    const rows = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id))
        .limit(1);

    const sub = rows[0] ?? null;

    // ── Gate: must have a matching subscription ───────────────────────────────
    if (!sub) {
        structuredLogger.warn('stripe_sub_deleted_no_match', {
            stripeSubscriptionId: subscription.id,
            eventType: 'stripe_webhook',
        });
        return IGNORED('no_matching_subscription');
    }

    // ── Gate: already canceled → no-op (idempotent) ──────────────────────────
    if (sub.status === 'canceled') {
        structuredLogger.info('stripe_sub_deleted_already_canceled', {
            tenantId: sub.tenantId,
            stripeSubscriptionId: subscription.id,
            eventType: 'stripe_webhook',
        });
        return IGNORED('already_canceled');
    }

    // ── Cancel ────────────────────────────────────────────────────────────────
    await db
        .update(tenantSubscriptions)
        .set({ status: 'canceled', endedAt: new Date() })
        .where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id));

    structuredLogger.info('stripe_subscription_deleted_processed', {
        tenantId: sub.tenantId,
        stripeSubscriptionId: subscription.id,
        eventType: 'stripe_webhook',
    });

    return PROCESSED();
}

// ── Main handler ────────────────────────────────────────────────────────────────

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

    // ── Idempotency gate ──────────────────────────────────────────────────────
    const stripeCreatedAt = event.created ? new Date(event.created * 1000) : undefined;
    const idempotencyResult = await insertStripeEventOnce(
        event.id,
        event.type,
        rawBody,
        stripeCreatedAt,
    );

    if (idempotencyResult.errorKind === 'db_error') {
        structuredLogger.error('stripe_event_save_failed', {
            eventId: event.id,
            type: event.type,
            error: idempotencyResult.error,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ error: 'Failed to record event.' }, { status: 500 });
    }

    if (!idempotencyResult.inserted) {
        structuredLogger.info('stripe_event_duplicate_skipped', {
            eventId: event.id,
            type: event.type,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────
    let handlerResult: HandlerResult = PROCESSED();

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                handlerResult = await handleCheckoutCompleted(
                    event.data.object as Stripe.Checkout.Session,
                );
                break;

            case 'invoice.paid':
                handlerResult = await handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'customer.subscription.deleted':
                handlerResult = await handleSubscriptionDeleted(
                    event.data.object as Stripe.Subscription,
                );
                break;

            default:
                structuredLogger.info('stripe_event_unhandled', {
                    eventId: event.id,
                    type: event.type,
                    eventType: 'stripe_webhook',
                });
        }
    } catch (err) {
        structuredLogger.error('stripe_event_processing_failed', {
            eventId: event.id,
            type: event.type,
            errorCode: err instanceof BillingServiceError ? err.code : 'UNKNOWN',
            error: err,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json(
            { received: true, error: 'Processing failed — event recorded for manual replay.' },
            { status: 200 },
        );
    }

    if (handlerResult.ignored) {
        return NextResponse.json(
            { received: true, ignored: true, reason: handlerResult.reason },
            { status: 200 },
        );
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
