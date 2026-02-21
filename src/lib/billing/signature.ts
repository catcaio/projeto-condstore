import { stripe } from './stripe';
import Stripe from 'stripe';

export function verifyStripeSignature(rawBody: string, sig: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET is not set in environment.");
    }

    try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        return event;
    } catch (err: any) {
        throw new Error(`Webhook Error: ${err.message}`);
    }
}
