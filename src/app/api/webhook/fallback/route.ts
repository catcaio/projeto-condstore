import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../infra/logger';

export const runtime = "nodejs";

/**
 * POST /api/webhook/fallback
 * 
 * Safety fallback route for Twilio. Configured as the "Fallback URL" in the 
 * Twilio console. It triggers if the primary webhook fails, crashes, or times out.
 * 
 * Guarantees a 200 OK with safe TwiML response, avoiding dead air for users.
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);

        // Twilio sends ErrorCode and ErrorUrl to the fallback webhook
        const errorCode = params.get('ErrorCode');
        const errorUrl = params.get('ErrorUrl');
        const from = params.get('From');

        logger.error('Fallback Webhook Triggered!', new Error('Primary Webhook Failure'), {
            event: 'WEBHOOK_FALLBACK',
            twilioErrorCode: errorCode,
            twilioErrorUrl: errorUrl,
            sender: from ? logger.maskPhone(from) : 'unknown'
        });

    } catch (err) {
        logger.error('Error logging fallback trigger', err as Error);
    }

    // Always return 200 OK with static maintenance TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Sistema em manutenção rápida. Tente novamente em instantes.</Message>
</Response>`;

    return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
    });
}
