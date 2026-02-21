import crypto from 'node:crypto';

export interface StripeEvent {
    id: string;
    type: string;
    data: {
        object: any;
    };
}

function parseStripeSignature(sigHeader: string): { timestamp: string; signatures: string[] } {
    const pieces = sigHeader.split(',');
    const timestamp = pieces.find((part) => part.startsWith('t='))?.slice(2);
    const signatures = pieces
        .filter((part) => part.startsWith('v1='))
        .map((part) => part.slice(3))
        .filter(Boolean);

    if (!timestamp || signatures.length === 0) {
        throw new Error('Invalid stripe-signature header format');
    }

    return { timestamp, signatures };
}

export function verifyStripeSignature(rawBody: string, sig: string): StripeEvent {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment.');
    }

    const { timestamp, signatures } = parseStripeSignature(sig);
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

    const isValid = signatures.some((signature) => {
        try {
            return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
        } catch {
            return false;
        }
    });

    if (!isValid) {
        throw new Error('Webhook Error: Invalid signature');
    }

    return JSON.parse(rawBody) as StripeEvent;
}
