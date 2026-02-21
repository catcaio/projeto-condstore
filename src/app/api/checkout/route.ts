import { NextRequest, NextResponse } from 'next/server';
import { planData } from '../../../../components/pricing/planData';
import { getSessionUser } from '../../../infra/auth/session';
import { logger } from '../../../infra/logger';
import { createStripeCheckoutSession } from '../../../lib/billing/stripe';

export async function POST(req: NextRequest) {
    try {
        // ── Auth: tenantId MUST come from the verified session, never from the body ──
        const session = await getSessionUser(req);
        if (!session?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const body = await req.json();
        const { planId } = body; // planId from body is safe — it's just a plan selector

        // Validate planId
        const plan = planData.find(p => p.id === planId);
        if (!plan) {
            return NextResponse.json(
                { error: 'Invalid plan selected.' },
                { status: 400 }
            );
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ url: `https://checkout.stripe.com/pay/${plan.stripePriceId}` });
        }

        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        const stripeSession = await createStripeCheckoutSession({
            tenantId,
            stripePriceId: plan.stripePriceId,
            successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${appUrl}/pricing?canceled=1`,
        });

        logger.info('Stripe checkout session created', {
            event: 'checkout_session_created',
            planId: plan.id,
            // userId deliberately NOT logged (PII)
        });

        return NextResponse.json({ url: stripeSession.url });
    } catch (err: any) {
        logger.error('Checkout session creation failed', err as Error);
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 }
        );
    }
}
