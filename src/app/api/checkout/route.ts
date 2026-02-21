import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { planData } from '../../../../components/pricing/planData';
import { verify } from '../../../lib/auth/jwt';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
    apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { planId } = body;

        // Validating planId and user via cookies

        // Validate planId
        const plan = planData.find(p => p.id === planId);

        if (!plan) {
            return NextResponse.json(
                { error: 'Invalid plan selected.' },
                { status: 400 }
            );
        }

        const store = await cookies();
        const token = store.get('session')?.value;
        const decoded = await verify(token || '');
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized: Please login to checkout.' }, { status: 401 });
        }

        const userId = decoded.userId;

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ url: `https://checkout.stripe.com/pay/${plan.stripePriceId}` });
        }

        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            client_reference_id: userId,
            metadata: {
                userId: userId || ''
            },
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing?canceled=1`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 }
        );
    }
}
