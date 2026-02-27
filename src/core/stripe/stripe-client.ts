/**
 * Stripe singleton client.
 *
 * Usage:
 *   import { getStripe } from '@/core/stripe/stripe-client';
 *   const stripe = getStripe(); // throws if STRIPE_SECRET_KEY missing
 *
 * For routes that should gracefully degrade when Stripe is absent,
 * use isStripeEnabled() first.
 */

import Stripe from 'stripe';

const API_VERSION = '2026-02-25.clover' as const;

let _stripe: Stripe | null = null;

export function isStripeEnabled(): boolean {
    return (
        Boolean(process.env.STRIPE_SECRET_KEY) &&
        process.env.NEXT_PUBLIC_STRIPE_ENABLED === '1'
    );
}

export function getStripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not set.');
    }
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: API_VERSION,
        });
    }
    return _stripe;
}

/**
 * Maps internal plan IDs to Stripe Price IDs (from env).
 * Returns null for free plans (Starter) or unknown plan IDs.
 */
export function getPriceIdForPlan(planId: string): string | null {
    const map: Record<string, string | undefined> = {
        plan_growth: process.env.STRIPE_PRICE_GROWTH,
        plan_pro: process.env.STRIPE_PRICE_PRO,
        plan_scale: process.env.STRIPE_PRICE_SCALE,
    };
    return map[planId] ?? null;
}
