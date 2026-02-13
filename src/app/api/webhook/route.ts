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

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    logger.debug('Webhook received', { payload });

    // Validate Twilio Signature (enforced in all environments)
    const twilioSignature = request.headers.get('x-twilio-signature');
    const url = 'https://' + request.headers.get('host') + request.nextUrl.pathname;

    if (!twilioSignature) {
      logger.warn('Missing Twilio signature', {
        event: 'INVALID_WEBHOOK_SIGNATURE',
        reason: 'missing_header',
        url,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isValid = validateRequest(
      twilioConfig.authToken,
      twilioSignature,
      url,
      payload
    );

    if (!isValid) {
      logger.warn('Invalid Twilio signature', {
        event: 'INVALID_WEBHOOK_SIGNATURE',
        reason: 'signature_mismatch',
        url,
        twilioSignature,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse incoming message
    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);

    // Rate limiting per phone number
    const rateLimitResult = await checkRateLimit(incomingMessage.from);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for user', {
        event: 'RATE_LIMIT_EXCEEDED',
        from: incomingMessage.from,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      });
      const twiml = twilioProvider.generateTwiMLResponse(getThrottleMessage());
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Validate and sanitize webhook payload
    validateWebhookPayload(payload);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    logger.info('Incoming message parsed', {
      from: incomingMessage.from,
      body: incomingMessage.body,
      messageSid: incomingMessage.messageSid,
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
