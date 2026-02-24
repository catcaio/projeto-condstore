import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infra/logger';
import { verifyTwilioRequest } from '../../../../server/twilio/verifyWebhook';

export const runtime = "nodejs";

/**
 * POST /api/webhook/fallback
 *
 * Twilio calls this if the primary webhook fails, crashes, or times out.
 * Security: also validates Twilio signature here — an attacker must not be able
 * to reach the fallback directly to probe the system.
 *
 * Always responds 200 TwiML so Twilio doesn't keep retrying.
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();

    // ── Guard: TWILIO_AUTH_TOKEN must be configured ─────────────────────────────
    if (!process.env.TWILIO_AUTH_TOKEN) {
        logger.error(
            "TWILIO_AUTH_TOKEN is not configured — fallback webhook cannot verify signatures",
            new Error("TWILIO_AUTH_TOKEN missing"),
            { event: "webhook_fallback_misconfigured" }
        );
        return NextResponse.json(
            { error: "Webhook not properly configured." },
            { status: 500 }
        );
    }

    // ── Signature verification — mandatory on fallback too ──────────────────────
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => { payload[key] = value; });

    const signatureValid = verifyTwilioRequest(request, rawBody, payload);
    if (!signatureValid) {
        logger.warn("Fallback webhook rejected: invalid or missing Twilio signature", {
            event: "webhook_invalid_signature",
            endpoint: "fallback",
        });
        return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    // ── Log the triggering error handed to us by Twilio ─────────────────────────
    try {
        const errorCode = params.get('ErrorCode');
        const errorUrl = params.get('ErrorUrl');
        const from = params.get('From');

        logger.error('Fallback webhook triggered — primary webhook failed', new Error('Primary Webhook Failure'), {
            event: 'webhook_fallback_triggered',
            twilioErrorCode: errorCode,
            twilioErrorUrl: errorUrl,
            sender: from ? logger.maskPhone(from) : 'unknown',
        });
    } catch (err) {
        logger.error('Error logging fallback trigger', err as Error);
    }

    // ── Always return 200 OK with static maintenance TwiML ──────────────────────
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Sistema em manutenção rápida. Tente novamente em instantes.</Message>
</Response>`;

    return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
    });
}
