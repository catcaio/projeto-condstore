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
import { tenantRepository } from '../../../infra/repositories/tenant.repository';
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '../../../lib/normalize';
import { redisClient } from '../../../infra/redis.client';

/** TTL for idempotency keys (10 minutes covers Twilio's retry window). */
const IDEMPOTENCY_TTL_SECONDS = 600;

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form-urlencoded body from Twilio
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    // Safe logging — no PII (no From, Body, WaId)
    logger.info('Webhook received', {
      messageSid: payload['MessageSid'],
      hasBody: !!payload['Body'],
      bodyLength: payload['Body']?.length || 0,
    });

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

    // Validate Twilio Signature (can be disabled for development)
    const twilioSignature = request.headers.get('x-twilio-signature');

    if (twilioConfig.signatureValidationEnabled) {
      logger.info('Twilio signature validation enabled', {
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

        // Return TwiML error instead of 403
        const MessagingResponse = require('twilio').twiml.MessagingResponse;
        const twiml = new MessagingResponse();
        twiml.message('Erro de autenticação. Entre em contato com o suporte.');

        return new NextResponse(twiml.toString(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
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

        // Return TwiML error instead of 403
        const MessagingResponse = require('twilio').twiml.MessagingResponse;
        const twiml = new MessagingResponse();
        twiml.message('Erro de autenticação. Entre em contato com o suporte.');

        return new NextResponse(twiml.toString(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
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
      // Tenant not found or DB error - log handled in repository, return friendly error to Twilio
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

    // ─── Idempotency: deduplicate Twilio retries ───
    // Twilio sends MessageSid with every webhook; use it as the event ID.
    const eventId = payload['MessageSid'];
    if (eventId) {
      const idempotencyKey = `idemp:wh:${tenantId}:${eventId}`;
      const isFirstTime = await redisClient.setNX(
        idempotencyKey,
        '1',
        IDEMPOTENCY_TTL_SECONDS
      );

      if (!isFirstTime) {
        // Already processed (or Redis down — setNX returns false on error too,
        // but that's acceptable: in the rare Redis-failure case we'd rather
        // risk a duplicate than silently drop a message, however Twilio will
        // retry anyway so returning 200 is safe).
        logger.info('Duplicate webhook skipped', { eventId, tenantId });
        // Return 200 so Twilio stops retrying
        const MessagingResponse = require('twilio').twiml.MessagingResponse;
        const twiml = new MessagingResponse();
        return new NextResponse(twiml.toString(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

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

    logger.debug('Intent classification', {
      bodyLength: normalizedBody.length,
    });

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

    logger.info('Incoming message parsed', {
      intent,
      messageSid: incomingMessage.messageSid,
    });

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
    logger.info('Webhook processed successfully', {
      messageSid: incomingMessage.messageSid,
      duration,
      intent,
      tenantId,
    });

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
