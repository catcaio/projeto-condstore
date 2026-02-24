import { NextResponse } from 'next/server';
import { verifyStripeSignature, StripeEvent } from '../../../../lib/billing/signature';
import { planData } from '../../../../../components/pricing/planData';
import { SubscriptionStatus } from '../../../../lib/billing/types';
import { getDb } from '@/infra/db';
import { tenants } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { auditService } from '../../../../modules/audit/audit.service';

export const runtime = 'nodejs'; // Use Node.js runtime for Stripe streaming/raw parsing safely

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
        }

        let event: StripeEvent;
        try {
            event = verifyStripeSignature(rawBody, signature);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: 'Webhook Error: Invalid signature' }, { status: 400 });
        }

        const handledEvents = [
            'checkout.session.completed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
        ];

        if (handledEvents.includes(event.type)) {
            await handleSubscriptionEvent(event);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Unhandled webhook error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}

type StripeCheckoutSession = {
    id: string;
    mode?: string;
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
    customer?: string | { id?: string };
    subscription?: string | { id?: string } | null;
};

type StripeSubscription = {
    id: string;
    customer: string | { id: string };
    status: string;
    metadata?: Record<string, string>;
    items: { data: Array<{ price: { id: string } }> };
    current_period_end?: number;
    cancel_at_period_end?: boolean;
};

async function handleSubscriptionEvent(event: StripeEvent) {
    let subscription: StripeSubscription;
    let tenantIdStr: string = '';
    let customerId = '';
    let status: SubscriptionStatus = 'incomplete';
    let currentPeriodEnd = 0;
    let priceId = '';

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as StripeCheckoutSession;
        if (session.mode !== 'subscription') return; // Only process subscriptions

        // Extract tenantId from metadata or client_reference_id
        let clientRef = session.client_reference_id || '';
        if (clientRef.startsWith('tenant:')) {
            tenantIdStr = clientRef.replace('tenant:', '');
        } else {
            tenantIdStr = session.metadata?.tenantId || '';
        }

        customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';

        if (!tenantIdStr || !customerId) {
            console.warn('Skipping checkout session: missing tenantId or customerId', { id: session.id });
            return;
        }

        // Link customer and subscription to the tenant
        try {
            const db = await getDb();
            let subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;

            await db.update(tenants)
                .set({
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId
                })
                .where(eq(tenants.id, tenantIdStr));
            console.log(`[Stripe Webhook] Linked customer ${customerId} to tenant ${tenantIdStr}`);

            // Note: Plan status is typically populated by customer.subscription.created/updated which fires around the same time
        } catch (err: any) {
            console.error('Failed to link customer to tenant', err);
        }

        return;
    } else {
        // customer.subscription.created | .updated | .deleted
        subscription = event.data.object as StripeSubscription;
        customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        status = subscription.status as SubscriptionStatus;
        currentPeriodEnd = (subscription as any).current_period_end || 0;
        // Assume single item subscription for simplicity
        const item = subscription.items.data[0];
        if (item) {
            priceId = item.price.id;
        }

        tenantIdStr = subscription.metadata?.tenantId || '';
    }

    if (!priceId) {
        console.warn('Skipping event: missing priceId', { type: event.type, customerId });
        return;
    }

    // Determine the plan based on priceId
    const planObj = planData.find((p: any) => p.stripePriceId === priceId) || planData[0]; // fallback if mismatched
    const planName = planObj ? planObj.id.toUpperCase() : 'FREE';

    try {
        const db = await getDb();
        const currentPeriodEndDate = new Date(currentPeriodEnd * 1000);

        if (tenantIdStr) {
            // Update tenant using the passed metadata tenantId
            await db.update(tenants)
                .set({
                    stripeSubscriptionId: subscription.id,
                    plan: planName,
                    planStatus: status,
                    planCurrentPeriodEnd: currentPeriodEndDate
                })
                .where(eq(tenants.id, tenantIdStr));
            console.log(`[Stripe Webhook] Updated subscription for tenant ${tenantIdStr} to status ${status}`);
        } else {
            // Fallback: update tenant by stripeCustomerId
            await db.update(tenants)
                .set({
                    stripeSubscriptionId: subscription.id,
                    plan: planName,
                    planStatus: status,
                    planCurrentPeriodEnd: currentPeriodEndDate
                })
                .where(eq(tenants.stripeCustomerId, customerId));
            console.log(`[Stripe Webhook] Updated subscription by customerId ${customerId} to status ${status}`);

            // To log the event we need the tenantId, let's fetch it if we don't have it
            if (!tenantIdStr) {
                const updatedTenant = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.stripeCustomerId, customerId)).limit(1);
                if (updatedTenant.length > 0) {
                    tenantIdStr = updatedTenant[0].id;
                }
            }
        }

        if (tenantIdStr) {
            let eventType: 'PLAN_ACTIVATED' | 'PLAN_UPDATED' | 'PLAN_CANCELED' = 'PLAN_UPDATED';
            if (status === 'active' || status === 'trialing') eventType = 'PLAN_ACTIVATED';
            if (status === 'canceled' || status === 'unpaid') eventType = 'PLAN_CANCELED';
            if (event.type === 'customer.subscription.updated') eventType = 'PLAN_UPDATED';

            await auditService.logEvent(tenantIdStr, eventType, {
                stripeEvent: event.type,
                plan: planName,
                status,
                currentPeriodEnd: currentPeriodEndDate.toISOString()
            });
        }
    } catch (err: any) {
        console.error('Failed to update tenant subscription status', err);
    }
}

