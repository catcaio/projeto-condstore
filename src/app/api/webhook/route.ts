/**
 * Twilio WhatsApp Webhook.
 * Entry point for incoming WhatsApp messages.
 * Thin layer that delegates to the freight controller.
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioProvider } from '../../../providers/twilio.provider';
import { twilioConfig } from '../../../config/twilio.config';
import { logger } from '../../../infra/logger';
import { BaseError, getUserMessage } from '../../../infra/errors';
import { checkRateLimit, getThrottleMessage } from '../../../infra/rate-limiter';
import { sanitizeMessage, validateWebhookPayload } from '../../../lib/validation';
import { messageRepository } from '../../../infra/repositories/message.repository';
import { tenantRepository } from '../../../infra/repositories/tenant.repository';
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '../../../lib/normalize';
import { verifyTwilioRequest, getPublicUrl } from '../../../server/twilio/verifyWebhook';
import { safeWebhookContext, isDebugEnabled } from '../../../server/logging/safeLog';

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.debug('Webhook request received');

    // Read raw body once — used for both signature validation and param parsing.
    // req.text() consumes the stream; everything downstream uses rawBody.
    const rawBody = await request.text();
    const contentType = request.headers.get('content-type') ?? '';

    // Twilio WhatsApp webhooks always send application/x-www-form-urlencoded.
    // Reject JSON bodies explicitly — they are not sent by Twilio and likely
    // indicate a misconfigured caller or a spoofing attempt.
    if (contentType.includes('application/json')) {
      logger.warn('Webhook rejected: unsupported Content-Type', {
        event: 'UNSUPPORTED_CONTENT_TYPE',
        contentType,
      });
      return new Response(
        'Unsupported Media Type: Twilio webhooks must be application/x-www-form-urlencoded',
        { status: 415 }
      );
    }

    // Parse form-urlencoded params for signature validation and business logic.
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    logger.debug('Webhook received', safeWebhookContext({
      messageSid: payload['MessageSid'],
      hasBody: !!payload['Body'],
      bodyLength: payload['Body']?.length ?? 0,
    }));

    // ─── Signature Validation ──────────────────────────────────────────────
    // Must run BEFORE any business logic, including LLM calls.
    // Disabled only when TWILIO_SIGNATURE_VALIDATION_ENABLED=false (dev only).
    if (twilioConfig.signatureValidationEnabled) {
      logger.info('Twilio signature validation enabled', {
        url: getPublicUrl(request),
        hasSignature: !!request.headers.get('x-twilio-signature'),
      });

      const signatureMissing = !request.headers.get('x-twilio-signature');
      if (signatureMissing) {
        logger.warn('Missing Twilio signature', {
          event: 'INVALID_WEBHOOK_SIGNATURE',
          reason: 'missing_header',
          url: getPublicUrl(request),
          ip: request.headers.get('x-forwarded-for') ?? 'unknown',
        });
        return new Response('Forbidden', { status: 403 });
      }

      const isValid = verifyTwilioRequest(request, rawBody, payload);

      logger.info('Twilio signature validation result', {
        isValid,
        url: getPublicUrl(request),
      });

      if (!isValid) {
        logger.warn('Invalid Twilio signature', {
          event: 'INVALID_WEBHOOK_SIGNATURE',
          reason: 'signature_mismatch',
          url: getPublicUrl(request),
          ip: request.headers.get('x-forwarded-for') ?? 'unknown',
        });
        return new Response('Forbidden', { status: 403 });
      }
    } else {
      logger.warn('Twilio signature validation DISABLED (development mode)', {
        env: process.env.NODE_ENV,
      });
    }

    // ─── Resolve Tenant by Twilio Number ───
    logger.debug('[STEP 2] Resolving tenant by Twilio number');

    // Use raw 'To' field - repository handles normalization and logging
    const twilioNumberRaw = payload['To'];

    if (!twilioNumberRaw) {
      logger.error('Missing To field in webhook payload');

      const MessagingResponse = require('twilio').twiml.MessagingResponse;
      const twiml = new MessagingResponse();
      twiml.message('Erro interno');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    let tenant;
    try {
      // New robust resolution method
      tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
    } catch (error) {
      // Security boundary: Tenant not found -> 403
      if ((error as any).code === 'TENANT_NOT_FOUND') {
        logger.warn('Webhook rejected: Tenant not found for the received Twilio number');
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 403 }
        );
      }

      // Other errors (DB offline, etc) -> Return friendly error to Twilio (200 OK) to avoid retries
      const MessagingResponse = require('twilio').twiml.MessagingResponse;
      const twiml = new MessagingResponse();

      if (process.env.NODE_ENV === 'development') {
        twiml.message(`[DEV] Erro de resolução: ${(error as Error).message}`);
      } else {
        twiml.message('Serviço indisponível temporariamente.');
      }

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Tenant is guaranteed to be present if no error was thrown
    const twilioNumber = tenant.twilioNumber;

    const tenantId = tenant.id;
    logger.info('Tenant resolved', { tenantId });

    // Validate and sanitize webhook payload
    logger.debug('[STEP 3] Validating webhook payload');
    validateWebhookPayload(payload);

    // Parse incoming message
    logger.debug('[STEP 4] Parsing incoming message');
    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    // Intent Classification
    // FIX: Ensure body is lowercased and trimmed for comparison
    const normalizedBody = (incomingMessage.body || '').trim().toLowerCase();

    if (isDebugEnabled()) {
      logger.debug('Intent classification input', safeWebhookContext({
        hasBody: normalizedBody.length > 0,
        bodyLength: normalizedBody.length,
      }));
    }

    let intent = 'unknown';

    if (
      normalizedBody.includes('cotação') ||
      normalizedBody.includes('orcamento') ||
      normalizedBody.includes('orçamento')
    ) {
      intent = 'quote_request';
    } else if (
      normalizedBody.includes('preço') ||
      normalizedBody.includes('valor') ||
      normalizedBody.includes('frete') // ADDED: Specific support for 'frete'
    ) {
      intent = 'price_question';
    } else if (normalizedBody.includes('pedido')) {
      intent = 'order';
    }

    logger.info('Incoming message parsed', safeWebhookContext({
      messageSid: incomingMessage.messageSid,
      intent,
      hasBody: !!incomingMessage.body,
      bodyLength: incomingMessage.body?.length ?? 0,
    }));

    // ─── Persist inbound message (before rate limit, so throttled messages are also saved) ───
    logger.debug('[STEP 5] Persisting inbound message to database');
    // Sanitize rawPayload to remove PII before storage
    const sanitizedPayload = {
      MessageSid: payload['MessageSid'],
      AccountSid: payload['AccountSid'],
      MessagingServiceSid: payload['MessagingServiceSid'],
      NumMedia: payload['NumMedia'],
      // Omit From, To, Body and other PII fields
    };

    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      tenantId,
      fromPhone: incomingMessage.from,
      toPhone: payload['To'] || null,
      body: incomingMessage.body,
      direction: 'inbound',
      intent,
      rawPayload: JSON.stringify(sanitizedPayload),
    });
    logger.debug('[STEP 5.1] Message persisted successfully');

    // ─── Generate Stateless TwiML Response (Bypass Session/Controller) ───
    logger.debug('[STEP 6] Generating TwiML response');
    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    let responseText = '';

    switch (intent) {
      case 'quote_request':
        responseText = 'Perfeito. Para te enviar um orçamento, me diga CEP, cidade/UF e o produto (ou link).';
        break;
      case 'price_question':
        responseText = 'Me diga o produto (ou link) e seu CEP que calculo o frete e o valor.';
        break;
      case 'order':
        responseText = 'Show. Qual produto e quantidade? Envie também CEP para calcular entrega.';
        break;
      default:
        // Default/Unknown intent
        responseText = 'Oi! Me diga se você quer orçamento, frete ou fazer um pedido 🙂';
        break;
    }

    twiml.message(responseText);
    logger.debug('[STEP 6.1] TwiML response generated', { responseText });

    const duration = Date.now() - startTime;
    logger.info('Webhook processed successfully', safeWebhookContext({
      messageSid: incomingMessage.messageSid,
      tenantId,
      intent,
      durationMs: duration,
    }));

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // Enhanced error logging with full details
    const errorDetails = {
      duration,
      errorName: (error as Error).name,
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
      errorCode: (error as any).code,
      errorContext: (error as any).context,
    };

    logger.error('Webhook processing failed', error as Error, errorDetails);

    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    const twiml = new MessagingResponse();

    // In development, expose detailed error for debugging
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      const errorMsg = (error as Error).message || 'Unknown error';
      const errorCode = (error as any).code || 'UNKNOWN';
      twiml.message(`[DEV] Erro: ${errorCode} - ${errorMsg}`);
    } else {
      twiml.message('Desculpe, ocorreu um erro. Tente novamente mais tarde.');
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
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
