/**
 * Twilio WhatsApp Webhook.
 * Entry point for incoming WhatsApp messages.
 * Thin layer that delegates to the freight controller.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';
import { freightController } from '../../../modules/freight/freight.controller';
import { twilioProvider } from '../../../providers/twilio.provider';
import { twilioConfig } from '../../../config/twilio.config';
import { logger } from '../../../infra/logger';
import { BaseError, getUserMessage } from '../../../infra/errors';
import { checkRateLimit, getThrottleMessage } from '../../../infra/rate-limiter';
import { sanitizeMessage, validateWebhookPayload } from '../../../lib/validation';
import { messageRepository } from '../../../infra/repositories/message.repository';

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form-urlencoded body from Twilio (preserve raw params for signature validation)
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    logger.debug('Webhook received', { payload });

    // Build the URL exactly as Twilio sees it (must match the URL configured in the Twilio console).
    // Priority: TWILIO_WEBHOOK_URL env > x-forwarded-* headers > host header fallback.
    const webhookUrlOverride = process.env.TWILIO_WEBHOOK_URL;
    let computedUrl: string;
    if (webhookUrlOverride) {
      computedUrl = webhookUrlOverride;
    } else {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
      computedUrl = `${proto}://${host}${request.nextUrl.pathname}`;
    }

    // Validate Twilio Signature (enforced in all environments)
    const twilioSignature = request.headers.get('x-twilio-signature');

    logger.info('Twilio signature validation attempt', {
      computedUrl,
      hasSignature: !!twilioSignature,
    });

    if (!twilioSignature) {
      logger.warn('Missing Twilio signature', {
        event: 'INVALID_WEBHOOK_SIGNATURE',
        reason: 'missing_header',
        url: computedUrl,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isValid = validateRequest(
      twilioConfig.authToken,
      twilioSignature,
      computedUrl,
      payload
    );

    logger.info('Twilio signature validation result', {
      isValid,
      computedUrl,
    });

    if (!isValid) {
      logger.warn('Invalid Twilio signature', {
        event: 'INVALID_WEBHOOK_SIGNATURE',
        reason: 'signature_mismatch',
        url: computedUrl,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate and sanitize webhook payload
    validateWebhookPayload(payload);

    // Parse incoming message
    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    // Intent Classification
    const normalizedBody = (incomingMessage.body || '').toLowerCase();
    let intent = 'unknown';

    if (
      normalizedBody.includes('cotação') ||
      normalizedBody.includes('orcamento') ||
      normalizedBody.includes('orçamento')
    ) {
      intent = 'quote_request';
    } else if (
      normalizedBody.includes('preço') ||
      normalizedBody.includes('valor')
    ) {
      intent = 'price_question';
    } else if (normalizedBody.includes('pedido')) {
      intent = 'order';
    }

    logger.info('Incoming message parsed', {
      from: incomingMessage.from,
      body: incomingMessage.body,
      intent,
      messageSid: incomingMessage.messageSid,
    });

    // ─── Persist inbound message (before rate limit, so throttled messages are also saved) ───
    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      fromPhone: incomingMessage.from,
      toPhone: payload['To'] || null,
      body: incomingMessage.body,
      direction: 'inbound',
      intent,
      rawPayload: JSON.stringify(payload),
    });

    // Process message through controller
    const result = await freightController.processMessage({
      phoneNumber: incomingMessage.from,
      message: incomingMessage.body,
    });

    // Generate TwiML response
    const twiml = twilioProvider.generateTwiMLResponse(result.reply);

    const duration = Date.now() - startTime;
    logger.info('Webhook processed successfully', {
      from: incomingMessage.from,
      duration,
      success: result.success,
    });

    // Return TwiML response
    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Webhook processing failed', error as Error, { duration });

    // Generate error response
    const errorMessage = error instanceof BaseError
      ? getUserMessage(error)
      : 'Desculpe, ocorreu um erro. Tente novamente mais tarde.';

    const twiml = twilioProvider.generateTwiMLResponse(errorMessage);

    return new NextResponse(twiml, {
      status: 200, // Always return 200 to Twilio to avoid retries
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

/**
 * GET /api/webhook
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'lojacond-frete-automacao',
    timestamp: new Date().toISOString(),
  });
}
