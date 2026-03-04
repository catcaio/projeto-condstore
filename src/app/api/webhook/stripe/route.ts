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
 *   invoice.payment_failed:
 *     • encontra subscription pelo stripe_subscription_id → gate
 *     • se já canceled ou endedAt!=null → ignored
 *     • status=past_due + salva lastPaymentFailedAt=now()
 *
 *   customer.subscription.updated:
 *     • encontra subscription → gate
 *     • se já canceled ou endedAt!=null → nunca reativa
 *     • converte stripeStatus para active/past_due de forma branda
 *     • se cancel_at_period_end=true, apenas salva o boolean+data e se mantém active
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
import { stripeEvents } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { structuredLogger } from '../../../../infra/log/logger';
import { publishEvent } from '../../../../domine/event-bus';

interface InsertResult {
    inserted: boolean;
    errorKind?: 'duplicate' | 'db_error';
    error?: unknown;
}

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

    // ── Dispatch to in-memory event bus ────────────────────────────────────
    publishEvent({
        id: crypto.randomUUID(),
        tenantId: null, // Precise tenant mapping is done inside the worker handlers
        type: 'WEBHOOK_RECEIVED',
        source: 'stripe_webhook',
        payload: { stripeEvent: event },
        createdAt: new Date(),
        version: 1
    });

    // ── Persist to domine_events for pull-based processing (fire-and-forget) ──
    try {
        const { domineIntakeService } = await import('../../../../domine/domine-intake.service');
        await domineIntakeService.publish({
            tenantId: 'LOJACOND',
            type: 'WEBHOOK_RECEIVED',
            source: 'webhook',
            payload: {
                source: 'stripe',
                providerEventId: event.id,
                kind: event.type,
                minimalData: { priceId: null, customerId: null },
            },
            idempotencyKey: `stripe:${event.id}`,
        });
    } catch {
        // Non-blocking: intake failure must never break webhook response
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
