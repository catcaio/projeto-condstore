import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/billing/stripe';
import { getSubscription } from '../../../../lib/billing/subscriptionStore';
import { verify } from '../../../../lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const store = await cookies();
        const sessionToken = store.get('session')?.value;
        const decoded = verify(sessionToken || '');

        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = decoded.userId;

        const subscription = await getSubscription(userId);

        if (!subscription || !subscription.stripeCustomerId) {
            return NextResponse.json({ error: 'Customer not found or no active subscription' }, { status: 400 });
        }

        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        // Create Stripe Billing Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${appUrl}/billing`,
        });

        return NextResponse.json({ url: portalSession.url });

    } catch (error: any) {
        console.error('[Billing Portal Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
