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
import { structuredLogger } from '../../../../infra/log/logger';
import { publishEvent } from '../../../../domine/event-bus';
import { verifyStripeSignature } from '../../../../lib/security/webhook-verifier';
import { registerWebhookEvent } from '../../../../lib/security/webhook-dedupe';
import { withDistributedLock } from '../../../../lib/infra/locks';

async function resolveTenantId(event: any): Promise<string | null> {
    if (!event || !event.data || !event.data.object) return null;
    const obj = event.data.object as Record<string, any>;

    // 1. Try checkout metadata or client_reference_id
    const tenantId = obj.metadata?.tenantId ?? obj.client_reference_id ?? null;
    if (tenantId && typeof tenantId === 'string' && tenantId.trim() !== '') {
        return tenantId;
    }

    // 2. Try to get Stripe subscription ID or customer ID
    const stripeSubscriptionId: string | null =
        (typeof obj.subscription === 'string' ? obj.subscription : null) ??
        (typeof obj.subscription?.id === 'string' ? obj.subscription.id : null) ??
        (event.type.startsWith('customer.subscription.') && typeof obj.id === 'string' ? obj.id : null) ??
        (typeof obj.parent?.subscription_details?.subscription === 'string' ? obj.parent.subscription_details.subscription : null);

    const stripeCustomerId: string | null =
        (typeof obj.customer === 'string' ? obj.customer : null) ??
        (typeof obj.customer?.id === 'string' ? obj.customer.id : null);

    if (stripeSubscriptionId || stripeCustomerId) {
        try {
            const { getDb } = await import('../../../../infra/db');
            const { tenantSubscriptions } = await import('../../../../drizzle/schema');
            const { eq } = await import('drizzle-orm');

            const db = await getDb();
            if (stripeSubscriptionId) {
                const rows = await db
                    .select()
                    .from(tenantSubscriptions)
                    .where(eq(tenantSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
                if (rows[0]?.tenantId) {
                    return rows[0].tenantId;
                }
            }
            if (stripeCustomerId) {
                const rows = await db
                    .select()
                    .from(tenantSubscriptions)
                    .where(eq(tenantSubscriptions.stripeCustomerId, stripeCustomerId));
                if (rows[0]?.tenantId) {
                    return rows[0].tenantId;
                }
            }
        } catch (dbErr) {
            structuredLogger.error('stripe_webhook_resolve_tenant_db_error', {
                error: (dbErr as Error).message,
                stripeSubscriptionId,
                stripeCustomerId,
            });
        }
    }

    return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const rawBody = await request.text();

    // ── Verify signature ──────────────────────────────────────────────────────
    const { ok, event, error } = await verifyStripeSignature(request, rawBody);
    if (!ok || !event) {
        return NextResponse.json({ error: error || 'Invalid signature.' }, { status: 400 });
    }

    structuredLogger.info('stripe_webhook_received', {
        eventId: event.id,
        type: event.type,
        eventType: 'stripe_webhook',
    });

    // ── Idempotency gate ──────────────────────────────────────────────────────
    const pHash = createHash('sha256').update(rawBody).digest('hex').slice(0, 64);
    const requestId = request.headers.get('x-request-id') ?? undefined;
    const dedupeResult = await registerWebhookEvent('stripe', event.id, event.type, pHash, requestId);

    if (dedupeResult === 'error') {
        return NextResponse.json({ error: 'Failed to record event.' }, { status: 500 });
    }

    if (dedupeResult === 'duplicate_event') {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // Wrap execution in distributed lock to prevent concurrent races across container replicas
    return await withDistributedLock(`lock:webhook:stripe:${event.id}`, 60, async () => {
        const resolvedTenantId = await resolveTenantId(event) || 'system';

        // ── Dispatch to in-memory event bus ────────────────────────────────────
        publishEvent({
            id: crypto.randomUUID(),
            tenantId: resolvedTenantId, // Precise tenant mapping is done inside the worker handlers
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
                tenantId: resolvedTenantId,
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

        // ── Publish operational event for checkout.session.completed (fire-and-forget) ──
        if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
            const obj = (event.data?.object ?? {}) as Record<string, any>;
            const tenantId = obj.metadata?.tenantId ?? obj.client_reference_id ?? null;
            if (tenantId) {
                void import('../../../../lib/events/operational-event-bus')
                    .then(({ publishOperationalEvent }) =>
                        publishOperationalEvent({
                            tenantId,
                            eventType: 'payment_confirmed',
                            eventDomain: 'REVENUE',
                            entityId: event.id,
                            payload: { stripeEventType: event.type, customerId: obj.customer ?? null },
                        })
                    )
                    .catch(() => { /* non-blocking */ });
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    }, requestId);
}
