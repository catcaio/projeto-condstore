import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '../../core/stripe/stripe-client';
import { verifyTwilioRequest } from '../../server/twilio/verifyWebhook';
import { structuredLogger } from '../../infra/log/logger';

export async function verifyStripeSignature(req: NextRequest, rawBody: string): Promise<{ ok: boolean; event?: Stripe.Event; error?: string }> {
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        structuredLogger.error('stripe_webhook_secret_missing', {
            eventType: 'stripe_webhook',
            errorCode: 'CONFIGURATION_ERROR',
        });
        return { ok: false, error: 'Webhook not configured.' };
    }

    if (!sig) {
        return { ok: false, error: 'Missing Stripe-Signature header.' };
    }

    try {
        const stripe = getStripe();
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        return { ok: true, event };
    } catch (err) {
        structuredLogger.warn('stripe_signature_invalid', {
            error: (err as Error).message,
            eventType: 'stripe_webhook',
        });
        return { ok: false, error: 'Invalid signature.' };
    }
}

export function verifyTwilioSignature(req: NextRequest, rawBody: string = "", formParams: Record<string, string> = {}): boolean {
    return verifyTwilioRequest(req, rawBody, formParams);
}
