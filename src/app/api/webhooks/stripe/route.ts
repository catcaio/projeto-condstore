import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '../../../../lib/billing/signature';
import { upsertSubscription } from '../../../../lib/billing/subscriptionStore';
import { planData } from '../../../../../components/pricing/planData';
import { SubscriptionRecord, SubscriptionStatus } from '../../../../lib/billing/types';
import Stripe from 'stripe';

export const runtime = 'nodejs'; // Use Node.js runtime for Stripe streaming/raw parsing safely

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
        }

        let event: Stripe.Event;
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

async function handleSubscriptionEvent(event: Stripe.Event) {
    let subscription: Stripe.Subscription;
    let userId: string = '';
    let customerId = '';
    let status: SubscriptionStatus = 'incomplete';
    let currentPeriodEnd = 0;
    let cancelAtPeriodEnd = false;
    let priceId = '';

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') return; // Only process subscriptions

        userId = session.client_reference_id || session.metadata?.userId || '';
        customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';

        // We will process the actual subscription status via the 'customer.subscription.*' events,
        // but often we want to link the customer to the user ID here if not done elsewhere.
        // We can wait for the 'customer.subscription.updated' which carries the same data but fully populated subscription.
        // However, we'll try to extract what we can if needed, but best practice is to rely on subscription events for subscription state.
        return;
    } else {
        // customer.subscription.created | .updated | .deleted
        subscription = event.data.object as Stripe.Subscription;
        customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        status = subscription.status as SubscriptionStatus;
        currentPeriodEnd = (subscription as any).current_period_end || 0;
        cancelAtPeriodEnd = (subscription as any).cancel_at_period_end || false;

        // Assume single item subscription for simplicity
        const item = subscription.items.data[0];
        if (item) {
            priceId = item.price.id;
        }

        userId = subscription.metadata?.userId || '';
    }

    if (!userId && customerId) {
        userId = `anonymous:${customerId}`;
    }

    if (!userId || !priceId) {
        console.warn('Skipping event: missing userId or priceId', { type: event.type, customerId });
        return;
    }

    const plan = planData.find((p: any) => p.stripePriceId === priceId) || planData[0]; // fallback if mismatched

    const record: SubscriptionRecord = {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        planId: plan.id,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        updatedAt: Math.floor(Date.now() / 1000),
    };

    await upsertSubscription(record);
}
