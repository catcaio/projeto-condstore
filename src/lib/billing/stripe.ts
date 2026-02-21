interface CreateCheckoutSessionParams {
    stripePriceId: string;
    tenantId: string;
    successUrl: string;
    cancelUrl: string;
}

interface StripeCheckoutSessionResponse {
    id: string;
    url: string | null;
}

export async function createStripeCheckoutSession(params: CreateCheckoutSessionParams): Promise<StripeCheckoutSessionResponse> {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not set.');
    }

    const body = new URLSearchParams();
    body.set('client_reference_id', `tenant:${params.tenantId}`);
    body.set('metadata[tenantId]', params.tenantId);
    body.set('line_items[0][price]', params.stripePriceId);
    body.set('line_items[0][quantity]', '1');
    body.set('mode', 'subscription');
    body.set('success_url', params.successUrl);
    body.set('cancel_url', params.cancelUrl);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': '2024-06-20',
        },
        body,
    });

    const payload = await response.json();

    if (!response.ok) {
        const message = payload?.error?.message ?? 'Failed to create Stripe checkout session';
        throw new Error(message);
    }

    return {
        id: payload.id,
        url: payload.url ?? null,
    };
}
