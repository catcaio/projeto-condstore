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

    // Sanitized logging - no PII
    logger.debug('Webhook received', {
      messageSid: payload['MessageSid'],
      hasBody: !!payload['Body'],
      bodyLength: payload['Body']?.length || 0
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
    const twilioNumber = payload['To'];
    if (!twilioNumber) {
      logger.error('Missing To field in webhook payload');

      const MessagingResponse = require('twilio').twiml.MessagingResponse;
      const twiml = new MessagingResponse();
      twiml.message('Erro interno. Tente novamente mais tarde.');

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const tenant = await tenantRepository.getTenantByTwilioNumber(twilioNumber);
    if (!tenant) {
      logger.warn('Unknown Twilio number - tenant not found', {
        twilioNumber,
        event: 'UNKNOWN_TENANT',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      const MessagingResponse = require('twilio').twiml.MessagingResponse;
      const twiml = new MessagingResponse();
      twiml.message('Número não configurado. Entre em contato com o suporte.');

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const tenantId = tenant.id;
    logger.info('Tenant resolved', {
      twilioNumber,
      tenantId,
      tenantName: tenant.name,
    });

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

    // ─── Generate Stateless TwiML Response (Bypass Session/Controller) ───
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

    const duration = Date.now() - startTime;
    logger.info('Webhook processed successfully (stateless)', {
      from: incomingMessage.from,
      duration,
      intent,
    });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Webhook processing failed', error as Error, { duration });

    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    twiml.message('Desculpe, ocorreu um erro. Tente novamente mais tarde.');

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
