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
import { withCircuitBreaker } from '@/lib/resilience/circuit-breaker';

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
        const client = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: API_VERSION,
        });
        _stripe = withCircuitBreaker('stripe', client);
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

/**
 * Returns the set of all configured Stripe Price IDs (whitelist).
 * Only prices present here are accepted by the webhook handler.
 */
export function getPriceWhitelist(): Set<string> {
    const whitelist = new Set<string>();
    const envVars = [
        process.env.STRIPE_PRICE_GROWTH,
        process.env.STRIPE_PRICE_PRO,
        process.env.STRIPE_PRICE_SCALE,
    ];
    for (const v of envVars) {
        if (v) whitelist.add(v);
    }
    return whitelist;
}

/**
 * Inverse of getPriceIdForPlan — resolves a Stripe Price ID to an internal plan ID.
 * Returns null if the priceId is not in the whitelist.
 */
export function getPlanIdFromPriceId(priceId: string): string | null {
    const map: Record<string, string | undefined> = {
        [process.env.STRIPE_PRICE_GROWTH ?? '']: 'plan_growth',
        [process.env.STRIPE_PRICE_PRO ?? '']: 'plan_pro',
        [process.env.STRIPE_PRICE_SCALE ?? '']: 'plan_scale',
    };
    return map[priceId] ?? null;
}
