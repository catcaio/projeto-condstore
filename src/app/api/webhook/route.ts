/**
 * Twilio WhatsApp Webhook.
 * Entry point for incoming WhatsApp messages.
 * Thin layer that delegates to the freight controller.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';
import { twilioProvider } from '../../../providers/twilio.provider';
import { twilioConfig } from '../../../config/twilio.config';
import { logger } from '../../../infra/logger';
import { BaseError, getUserMessage } from '../../../infra/errors';
import { checkRateLimit, getThrottleMessage } from '../../../infra/rate-limiter';
import { sanitizeMessage, validateWebhookPayload } from '../../../lib/validation';
import { messageRepository } from '../../../infra/repositories/message.repository';
import { tenantRepository } from '../../../infra/repositories/tenant.repository';
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from '../../../lib/normalize';
import { freightController } from '../../../legacy/freight.controller';

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form-urlencoded body from Twilio (preserve raw params for signature validation)
    // ─── A) Instrumentação de Logs (Solicitado) ───
    logger.info('=== WEBHOOK REQUEST STARTED ===');

    // Log headers for debugging
    const headersRaw: Record<string, string> = {};
    request.headers.forEach((v, k) => (headersRaw[k] = v));
    logger.info('Webhook Headers:', headersRaw);

    // Parse body for logging
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    // Log critical fields
    logger.info('Webhook Body Params:', {
      To: payload['To'],
      From: payload['From'],
      WaId: payload['WaId'],
      MessageSid: payload['MessageSid']
    });

    logger.debug('[STEP 1] Parsing complete');

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

        // Return 403 Forbidden
        return NextResponse.json(
          { error: 'Missing Twilio signature' },
          { status: 403 }
        );
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

        // Return 403 Forbidden
        return NextResponse.json(
          { error: 'Invalid Twilio signature' },
          { status: 403 }
        );
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
        logger.warn('Webhook rejected: Tenant not found', { twilioNumber: twilioNumberRaw });
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
    logger.info('Tenant resolved', {
      twilioNumber,
      tenantId,
      tenantName: tenant.name,
    });

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

    // ─── LOGGING INTENT CLASSIFICATION (Solicitado) ───
    logger.info('Intent Classification Debug', {
      rawBody: incomingMessage.body,
      normalizedBody: normalizedBody,
      length: normalizedBody.length
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
      from: incomingMessage.from,
      body: incomingMessage.body,
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

    // ─── Call FreightController (stateful conversation via StateMachine) ───
    logger.debug('[STEP 6] Calling FreightController with tenant context');
    const controllerResponse = await freightController.processMessage({
      tenantId,
      phoneNumber: incomingMessage.from,
      message: incomingMessage.body,
    });

    const MessagingResponse = require('twilio').twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    twiml.message(controllerResponse.reply);
    logger.debug('[STEP 6.1] Controller response generated', { reply: controllerResponse.reply });

    const duration = Date.now() - startTime;
    logger.info('Webhook processed successfully', {
      from: incomingMessage.from,
      duration,
      intent,
      controllerSuccess: controllerResponse.success,
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
