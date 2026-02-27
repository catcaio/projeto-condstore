export const runtime = 'nodejs';

/**
 * POST /api/webhook/stripe
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe Webhook handler — hardened idempotency:
 *
 *   1. Verificação de assinatura HMAC (STRIPE_WEBHOOK_SECRET)
 *   2. Idempotency gate via DB-level UNIQUE insert atômico:
 *      - INSERT stripe_events (id PK + stripe_event_id UNIQUE)
 *      - Se ER_DUP_ENTRY → retornar 200 { received:true, duplicate:true }
 *      - Se inserted=true → prosseguir para dispatch
 *   3. upgradeTenantPlan() SÓ roda quando inserted=true
 *   4. Eventos tratados:
 *      - checkout.session.completed → upgradeTenantPlan + salva stripe IDs
 *      - invoice.paid               → garante status=active na subscription
 *      - customer.subscription.deleted → cancela subscription
 *
 * Comprovação de idempotência:
 *   - O campo `id` na tabela stripe_events é PK (UNIQUE).
 *   - O campo `stripe_event_id` tem UNIQUE constraint explícito (migration 0012).
 *   - O INSERT é atômico: sem race condition em múltiplos workers/replicas.
 */

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '../../../../core/stripe/stripe-client';
import { getDb } from '../../../../infra/db';
import { stripeEvents, tenantSubscriptions } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { upgradeTenantPlan, BillingServiceError } from '../../../../modules/billing/billing.service';
import { structuredLogger } from '../../../../infra/log/logger';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InsertResult {
    inserted: boolean;   // true = nova entrada; false = duplicado
    errorKind?: 'duplicate' | 'db_error';
    error?: unknown;
}

// ── Idempotency guard ──────────────────────────────────────────────────────────

function isDuplicateEntry(err: unknown): boolean {
    const e = err as { code?: string; message?: string };
    return e?.code === 'ER_DUP_ENTRY' || Boolean(e?.message?.includes('Duplicate entry'));
}

/**
 * insertStripeEventOnce — DB-level atomic idempotency gate.
 *
 * Tenta inserir um registro em stripe_events usando o stripe_event_id como
 * identificador único. O banco garante unicidade via:
 *   - PRIMARY KEY (id)            ← mesmo valor que stripe_event_id (backward compat)
 *   - UNIQUE (stripe_event_id)    ← constraint explícita (migration 0012)
 *
 * Retorna:
 *   { inserted: true }   → evento é novo, pode processar
 *   { inserted: false, errorKind: 'duplicate' } → já processado, responder 200
 *   { inserted: false, errorKind: 'db_error', error } → falha real de DB
 */
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
            id: stripeEventId,             // PK (backward compat)
            stripeEventId,                 // UNIQUE alias  (migration 0012)
            receivedAt: new Date(),
            type,
            stripeCreatedAt: stripeCreatedAt ?? null,
            payloadHash,
        });

        return { inserted: true };
    } catch (err) {
        if (isDuplicateEntry(err)) {
            return { inserted: false, errorKind: 'duplicate' };
        }
        return { inserted: false, errorKind: 'db_error', error: err };
    }
}

// ── Event handlers ─────────────────────────────────────────────────────────────

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

    // Core upgrade flow via billing service
    await upgradeTenantPlan(tenantId, planId, `stripe:${session.id}`);

    // Persist Stripe IDs for subscription management
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
        planId,
        sessionId: session.id,
        eventType: 'stripe_webhook',
    });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Stripe SDK >=14 moved subscription into invoice.parent.subscription_details
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

// ── Main handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    const sig = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // ── Config check ────────────────────────────────────────────────────────────
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

    // ── Read raw body (must be text for signature verification) ─────────────────
    const rawBody = await request.text();

    // ── Verify Stripe signature ──────────────────────────────────────────────────
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

    // ── Idempotency gate (atomic DB insert) ─────────────────────────────────────
    // This is the ONLY place that decides whether to process the event.
    // upgradeTenantPlan() and all side-effectful code runs ONLY if inserted=true.
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
        // Duplicate event — acknowledge to Stripe without reprocessing
        structuredLogger.info('stripe_event_duplicate_skipped', {
            eventId: event.id,
            type: event.type,
            eventType: 'stripe_webhook',
        });
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // ── Dispatch (only reached when inserted=true) ───────────────────────────────
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
                structuredLogger.info('stripe_event_unhandled', {
                    eventId: event.id,
                    type: event.type,
                    eventType: 'stripe_webhook',
                });
        }
    } catch (err) {
        // Business logic failed AFTER we committed the idempotency record.
        // Return 200 to prevent Stripe retrying — event is marked for manual replay.
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

    return NextResponse.json({ received: true }, { status: 200 });
}
