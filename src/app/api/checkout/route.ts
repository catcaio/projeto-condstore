import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { planData } from '../../../../components/pricing/planData';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia' as any, // using latest or standard known version
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { planId } = body;

        // Validate planId
        const plan = planData.find(p => p.id === planId);

        if (!plan) {
            return NextResponse.json(
                { error: 'Invalid plan selected.' },
                { status: 400 }
            );
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            // Return a dummy url if we don't have stripe configured yet to prevent crashing
            return NextResponse.json({ url: `https://checkout.stripe.com/pay/${plan.stripePriceId}` });
        }

        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.get('origin')}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 }
        );
    }
}
