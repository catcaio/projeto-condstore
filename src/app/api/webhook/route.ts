/**
 * Twilio WhatsApp Webhook.
 * Entry point for incoming WhatsApp messages.
 * Thin layer that delegates to the freight controller (state machine).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { twilioProvider } from "../../../providers/twilio.provider";
import { twilioConfig } from "../../../config/twilio.config";
import { logger } from "../../../infra/logger";
import { sanitizeMessage, validateWebhookPayload } from "../../../lib/validation";
import { messageRepository } from "../../../infra/repositories/message.repository";
import { tenantRepository } from "../../../infra/repositories/tenant.repository";
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from "../../../lib/normalize";
import { verifyTwilioRequest } from "../../../server/twilio/verifyWebhook";
import { checkRateLimit, getThrottleMessage } from "../../../infra/rate-limiter";
import { freightController } from "../../../modules/freight/freight.controller";

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_BASE_URL) {
    logger.error('CRITICAL: APP_BASE_URL is missing in production. Cannot verify Twilio Webhook URL securely.', new Error('Missing APP_BASE_URL'));
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  const startTime = Date.now();

  // 1) Enforce form-urlencoded only (Twilio WhatsApp default)
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type. Use application/x-www-form-urlencoded." },
      { status: 415 }
    );
  }

  // 2) Read raw body once
  const rawBody = await request.text();

  // 3) Parse form params
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, string> = {};
  params.forEach((value, key) => {
    payload[key] = value;
  });

  // Safe log context (NO PII)
  const safeCtx = {
    requestId: request.headers.get("x-vercel-id") ?? undefined,
    messageSid: payload["MessageSid"] ?? undefined,
    accountSid: payload["AccountSid"] ?? undefined,
    hasBody: !!payload["Body"],
    bodyLength: payload["Body"]?.length ?? 0,
    durationMs: 0 as number,
  };

  try {
    // 4) Twilio signature verification (fail closed when enabled)
    if (twilioConfig.signatureValidationEnabled) {
      const ok = verifyTwilioRequest(request, rawBody, payload);
      if (!ok) {
        logger.warn("Webhook rejected: invalid/missing Twilio signature", {
          event: "INVALID_WEBHOOK_SIGNATURE",
          ...safeCtx,
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // 5) Resolve tenant by Twilio number ("To")
    const twilioNumberRaw = payload["To"];
    if (!twilioNumberRaw) {
      logger.warn("Webhook rejected: missing To field", {
        event: "WEBHOOK_MISSING_TO",
        ...safeCtx,
      });
      return twimlOk("Erro interno: payload inválido.");
    }

    let tenant;
    try {
      tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
    } catch (err) {
      if ((err as any)?.code === "TENANT_NOT_FOUND") {
        logger.warn("Webhook rejected: tenant not found", {
          event: "TENANT_NOT_FOUND",
          ...safeCtx,
        });
        return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
      }

      logger.error("Tenant resolution failed", err as Error, {
        event: "TENANT_RESOLUTION_ERROR",
        ...safeCtx,
      });

      // return 200 to Twilio to avoid retries storm
      return twimlOk("Serviço indisponível temporariamente.");
    }

    const tenantId = tenant.id;
    logger.info("Webhook tenant resolved", { tenantId, ...safeCtx });

    // 5.5) Rate Limit (Tenant + Sender)
    // Normalize "From" for consistent limits
    const rawFrom = payload["From"] || "";
    const fromNormalizedRL = normalizeWhatsAppNumber(rawFrom);

    // Limit: 20 messages per minute per user (generous but safe)
    const rateLimit = await checkRateLimit(`webhook:${tenantId}:${fromNormalizedRL}`, 20, 60);

    if (!rateLimit.allowed) {
      logger.warn("Webhook rejected: rate limit exceeded", {
        event: "RATE_LIMIT_EXCEEDED",
        tenantId,
        from: fromNormalizedRL,
        ...safeCtx,
      });
      return twimlOk(getThrottleMessage());
    }

    // 6) Validate and sanitize payload
    validateWebhookPayload(payload);

    // 7) Parse incoming message
    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    const fromNormalized = normalizeWhatsAppNumber(incomingMessage.from);
    if (!isValidWhatsAppNumber(fromNormalized)) {
      logger.warn("Webhook rejected: invalid From number format", {
        event: "INVALID_FROM_NUMBER",
        tenantId,
        ...safeCtx,
      });
      return twimlOk("Número inválido. Tente novamente.");
    }

    // 8) Persist inbound message (rawPayload WITHOUT PII)
    const sanitizedPayload = {
      MessageSid: payload["MessageSid"],
      AccountSid: payload["AccountSid"],
      MessagingServiceSid: payload["MessagingServiceSid"],
      NumMedia: payload["NumMedia"],
      // intentionally omit From/To/Body/WaId/ProfileName
    };

    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      tenantId,
      fromPhone: fromNormalized,          // stored (PII) for ops; do NOT log
      toPhone: payload["To"] || null,     // stored (PII) for ops; do NOT log
      body: incomingMessage.body,         // stored (PII) for ops; do NOT log
      direction: "inbound",
      intent: "freight_flow",             // avoid PII-heavy classifier logs here
      rawPayload: JSON.stringify(sanitizedPayload),
    });

    // Initialize and run freight logic
    logger.debug('Passing to Freight Controller (State Machine)');
    const tenantIdStr = tenant.id.toString();
    const senderNumber = fromNormalized;
    const messageText = incomingMessage.body ?? "";
    const messageSid = payload["MessageSid"] as string | undefined;

    const replyMessage = await freightController.handleIncoming(tenantIdStr, senderNumber, messageText, messageSid);

    const timeMs = Date.now() - startTime;
    safeCtx.durationMs = timeMs;

    logger.info('Webhook processed successfully', {
      event: "WEBHOOK_OK",
      tenantId: tenantIdStr,
      sender: logger.maskPhone(senderNumber),
      responseLength: replyMessage.length,
      ...safeCtx, // This already contains messageSid
    });

    return twimlOk(replyMessage);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    safeCtx.durationMs = durationMs;

    logger.error("Webhook processing failed", err as Error, {
      event: "WEBHOOK_ERROR",
      ...safeCtx,
    });

    // Always return 200 TwiML to avoid Twilio retry storms
    if (process.env.NODE_ENV === "development" || process.env.LOG_LEVEL === "debug") {
      return twimlOk(`[DEV] Erro: ${(err as Error)?.message ?? "Unknown"}`);
    }

    return twimlOk("Desculpe, ocorreu um erro. Tente novamente mais tarde.");
  }
}

/**
 * GET /api/webhook
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lojacond-frete-automacao",
    timestamp: new Date().toISOString(),
  });
}

function twimlOk(message: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MessagingResponse = require("twilio").twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  twiml.message(message);

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
