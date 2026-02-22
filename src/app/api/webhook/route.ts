/**
 * Twilio WhatsApp Webhook — Hardened.
 *
 * Security order (fail-fast):
 *   1. Content-type guard
 *   2. TWILIO_AUTH_TOKEN presence (500 if missing — no bypass ever)
 *   3. Signature verification (401 if invalid)
 *   4. Circuit breaker check (200 TwiML fallback if open)
 *   5. Dual rate limits: phone (10/60s) + tenant (200/3600s) → 200 TwiML if exceeded
 *   6. Payload validation (MessageSid required)
 *   7. Idempotency: duplicate MessageSid → 200 TwiML, no reprocessing
 *   8. Tenant resolution
 *   9. Business logic (freight controller)
 *  10. Structured audit log
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { twilioProvider } from "../../../providers/twilio.provider";
import { logger } from "../../../infra/logger";
import { sanitizeMessage, validateWebhookPayload } from "../../../lib/validation";
import { messageRepository } from "../../../infra/repositories/message.repository";
import { tenantRepository } from "../../../infra/repositories/tenant.repository";
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from "../../../lib/normalize";
import { verifyTwilioRequest } from "../../../server/twilio/verifyWebhook";
import { checkRateLimit } from "../../../infra/rate-limiter";
import { freightController } from "../../../modules/freight/freight.controller";
import { hashPhone } from "../../../lib/hash";
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  CIRCUIT_FALLBACK_MESSAGE,
} from "../../../infra/circuit-breaker";

// ─── TwiML helpers ────────────────────────────────────────────────────────────

function twimlOk(message: string): NextResponse {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MessagingResponse = require("twilio").twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  twiml.message(message);
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function twimlEmpty(): NextResponse {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

// ─── POST /api/webhook ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── 1. Guard: content-type ──────────────────────────────────────────────────
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type. Use application/x-www-form-urlencoded." },
      { status: 415 }
    );
  }

  // ── 2. Guard: TWILIO_AUTH_TOKEN must be configured ─────────────────────────
  if (!process.env.TWILIO_AUTH_TOKEN) {
    logger.error(
      "TWILIO_AUTH_TOKEN is not configured — webhook cannot verify signatures",
      new Error("TWILIO_AUTH_TOKEN missing"),
      { event: "webhook_misconfigured" }
    );
    return NextResponse.json(
      { error: "Webhook not properly configured." },
      { status: 500 }
    );
  }

  // ── 3. Read raw body ONCE — before any await that could drain the stream ────
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, string> = {};
  params.forEach((value, key) => { payload[key] = value; });

  // Safe log context (NO PII)
  const safeCtx = {
    requestId: request.headers.get("x-vercel-id") ?? undefined,
    messageSid: payload["MessageSid"] ?? undefined,
    accountSid: payload["AccountSid"] ?? undefined,
    hasBody: !!payload["Body"],
  };

  // ── 4. Signature verification — always mandatory, no bypass ────────────────
  const signatureValid = verifyTwilioRequest(request, rawBody, payload);
  if (!signatureValid) {
    logger.warn("Webhook rejected: invalid or missing Twilio signature", {
      event: "webhook_invalid_signature",
      ...safeCtx,
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // ── 5. Circuit breaker ─────────────────────────────────────────────────────
  if (isCircuitOpen()) {
    logger.warn("Webhook blocked: circuit breaker is OPEN", {
      event: "webhook_circuit_open",
      ...safeCtx,
    });
    return twimlOk(CIRCUIT_FALLBACK_MESSAGE);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // From here: failure in outer catch → circuit breaker recordFailure()
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // ── 6. provider_event_id (MessageSid) is mandatory ───────────────────────
    const messageSid = payload["MessageSid"];
    if (!messageSid) {
      logger.warn("Webhook rejected: missing MessageSid (provider_event_id)", {
        event: "webhook_missing_message_sid",
        ...safeCtx,
      });
      return NextResponse.json(
        { error: "Invalid payload: MessageSid is required." },
        { status: 400 }
      );
    }

    // ── 7. Resolve tenant EARLY — needed for per-tenant rate limit ───────────
    const twilioNumberRaw = payload["To"];
    if (!twilioNumberRaw) {
      logger.warn("Webhook rejected: missing To field", {
        event: "webhook_missing_to",
        ...safeCtx,
      });
      return twimlOk("Erro interno: payload inválido.");
    }

    let tenant: Awaited<ReturnType<typeof tenantRepository.resolveTenantByTwilioNumber>>;
    try {
      tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
    } catch (err) {
      if ((err as any)?.code === "TENANT_NOT_FOUND") {
        logger.warn("Webhook rejected: tenant not found", {
          event: "webhook_tenant_not_found",
          ...safeCtx,
        });
        return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
      }
      logger.error("Tenant resolution failed", err as Error, {
        event: "webhook_tenant_resolution_error",
        ...safeCtx,
      });
      return twimlOk("Serviço indisponível temporariamente.");
    }

    const tenantId = tenant.id.toString();

    // ── 8. Dual rate limits ──────────────────────────────────────────────────
    const rawFrom = payload["From"] || "";
    const phoneHash = hashPhone(rawFrom);

    // 8a. Per-phone: 10 messages / 60s
    const phoneLimitKey = `webhook:phone:${phoneHash}`;
    const phoneLimit = await checkRateLimit(phoneLimitKey, 10, 60);
    if (!phoneLimit.allowed) {
      logger.warn("Webhook rate limited: phone threshold", {
        event: "webhook_rate_limited",
        limitType: "phone",
        tenantId,
        phoneHash,
        ...safeCtx,
      });
      return twimlOk(
        "Muitas mensagens enviadas. Por favor, aguarde um momento antes de tentar novamente."
      );
    }

    // 8b. Per-tenant: 200 messages / 3600s (1h)
    const tenantLimitKey = `webhook:tenant:${tenantId}`;
    const tenantLimit = await checkRateLimit(tenantLimitKey, 200, 3600);
    if (!tenantLimit.allowed) {
      logger.warn("Webhook rate limited: tenant threshold", {
        event: "webhook_rate_limited",
        limitType: "tenant",
        tenantId,
        phoneHash,
        ...safeCtx,
      });
      return twimlOk(
        "Muitas mensagens recebidas no momento. Tente novamente em breve."
      );
    }

    // ── 9. Idempotency: reject duplicates ────────────────────────────────────
    const isDuplicate = await messageRepository.existsByMessageSid(messageSid);
    if (isDuplicate) {
      logger.info("Webhook duplicate ignored", {
        event: "webhook_duplicate_ignored",
        tenantId,
        phoneHash,
        providerEventId: messageSid,
        ...safeCtx,
      });
      return twimlEmpty();
    }

    // ── 10. Validate and sanitize payload ────────────────────────────────────
    validateWebhookPayload(payload);

    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    const fromNormalized = normalizeWhatsAppNumber(incomingMessage.from);
    if (!isValidWhatsAppNumber(fromNormalized)) {
      logger.warn("Webhook rejected: invalid From number format", {
        event: "webhook_invalid_from",
        tenantId,
        ...safeCtx,
      });
      return twimlOk("Número inválido. Tente novamente.");
    }

    // ── 11. Persist inbound message (sanitized, no PII in payload) ───────────
    const sanitizedPayload = {
      MessageSid: payload["MessageSid"],
      AccountSid: payload["AccountSid"],
      MessagingServiceSid: payload["MessagingServiceSid"],
      NumMedia: payload["NumMedia"],
    };

    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      tenantId,
      fromPhone: fromNormalized,
      toPhone: payload["To"] || null,
      body: incomingMessage.body,
      direction: "inbound",
      intent: "freight_flow",
      rawPayload: JSON.stringify(sanitizedPayload),
    });

    // ── 12. Business logic ────────────────────────────────────────────────────
    logger.debug("Delegating to FreightController (state machine)");
    const messageText = incomingMessage.body ?? "";

    const replyMessage = await freightController.handleIncoming(
      tenantId,
      fromNormalized,
      messageText,
      messageSid
    );

    const latencyMs = Date.now() - startTime;

    // ── 13. Structured audit log ──────────────────────────────────────────────
    logger.info("Webhook processed", {
      event: "webhook_processed",
      tenantId,
      phoneHash,
      providerEventId: messageSid,
      intent: "freight_flow",
      state: "handled",
      responseType: "twiml_ok",
      latencyMs,
    });

    // Circuit breaker: mark success
    recordSuccess();

    return twimlOk(replyMessage);
  } catch (err) {
    const latencyMs = Date.now() - startTime;

    logger.error("Webhook processing failed", err as Error, {
      event: "webhook_error",
      latencyMs,
      ...safeCtx,
    });

    // Circuit breaker: mark failure
    recordFailure();

    return twimlOk("Desculpe, ocorreu um erro. Tente novamente mais tarde.");
  }
}

// ─── GET /api/webhook ─────────────────────────────────────────────────────────

/**
 * Minimal liveness check (use /api/internal/health/webhook for deep health).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lojacond-frete-automacao",
    timestamp: new Date().toISOString(),
  });
}
