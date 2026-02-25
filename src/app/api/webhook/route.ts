/**
 * Twilio WhatsApp Webhook — Hardened.
 *
 * Security order (fail-fast):
 *   1. Content-type guard
 *   2. TWILIO_AUTH_TOKEN presence (500 if missing — no bypass ever)
 *   3. Signature verification (401 if invalid)
 *   4. Circuit breaker check (200 TwiML fallback if open)
 *   5. Rate limit (tenant+From, 30/60s) → 429 JSON if exceeded
 *   6. Payload validation (MessageSid required)
 *   7. Idempotency (DB dedup): duplicate MessageSid → 200 TwiML empty no-op
 *   8. Tenant resolution
 *   9. Business logic (freight controller)
 *  10. Structured audit log
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { twilioProvider } from "../../../providers/twilio.provider";
import { logger } from '../../../infra/logger';
import { attachRequestIdHeader, makeRequestId } from "../../../infra/http/request-trace";
import { sanitizeMessage, validateWebhookPayload } from "../../../lib/validation";
import { messageRepository } from "../../../infra/repositories/message.repository";
import { tenantRepository } from "../../../infra/repositories/tenant.repository";
import { aiDecisionLogRepository } from "../../../infra/repositories/ai-decision-log.repository";
import { verifyTwilioRequest } from "../../../server/twilio/verifyWebhook";
import { freightController } from "../../../modules/freight/freight.controller";
import { normalizeAndHash, isValidPhone } from "../../../lib/phone";
import { intentClassifier } from "../../../core/conversation/intent-classifier";
import { appendMessage } from "../../../infra/context-cache";
import { extractAttributionTokenFromText } from "../../../infra/attribution/token-parser";
import { attributionClickRepository } from "../../../infra/repositories/attribution-click.repository";
import { inboundMessageDedupRepository } from "../../../infra/repositories/inbound-message-dedup.repository";
import { sessionManager } from "../../../core/conversation/session-manager";
import type { AttributionSnapshot } from "../../../infra/attribution/attribution.types";
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  CIRCUIT_FALLBACK_MESSAGE,
} from "../../../infra/circuit-breaker";
import { ErrorCode, errorResponse } from "../../../infra/http/error-response";
import { structuredLogger } from "../../../infra/log/logger";
import { applyRateLimitHeaders, hashRateLimitKeyForLog, rateLimiter } from "../../../infra/security/rate-limiter";

// ─── TwiML helpers ────────────────────────────────────────────────────────────

function twimlOk(message: string, requestId?: string): NextResponse {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MessagingResponse = require("twilio").twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  twiml.message(message);
  const headers: Record<string, string> = { "Content-Type": "text/xml" };
  if (requestId) headers['X-Request-Id'] = requestId;
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers,
  });
}

function twimlEmpty(requestId?: string): NextResponse {
  const headers: Record<string, string> = { "Content-Type": "text/xml" };
  if (requestId) headers['X-Request-Id'] = requestId;
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { status: 200, headers }
  );
}

// ─── POST /api/webhook ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/webhook';
  let tenantIdForLog: string | undefined;

  structuredLogger.info('webhook_route_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finish = (response: NextResponse, code?: ErrorCode | string) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('webhook_route_end', {
      requestId,
      tenantId: tenantIdForLog,
      route,
      eventType: 'route_end',
      durationMs: Date.now() - startTime,
      status: response.status,
      outcome: response.status >= 400 ? 'error' : 'ok',
      errorCode: code,
    });
    return response;
  };

  logger.info('webhook_request_start', {
    requestId,
    method: 'POST',
    path: '/api/webhook',
  });

  // ── 1. Guard: content-type ──────────────────────────────────────────────────
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const latencyMs = Date.now() - startTime;
    logger.warn('webhook_invalid_content_type', {
      requestId,
      latencyMs,
      contentType,
    });
    return finish(
      errorResponse(
        ErrorCode.VALIDATION_ERROR,
        415,
        requestId,
        "Unsupported Media Type. Use application/x-www-form-urlencoded."
      ),
      ErrorCode.VALIDATION_ERROR,
    );
  }

  // ── 2. Guard: TWILIO_AUTH_TOKEN must be configured ─────────────────────────
  if (!process.env.TWILIO_AUTH_TOKEN) {
    const latencyMs = Date.now() - startTime;
    logger.error(
      "TWILIO_AUTH_TOKEN is not configured — webhook cannot verify signatures",
      new Error("TWILIO_AUTH_TOKEN missing"),
      { event: "webhook_misconfigured", requestId, latencyMs }
    );
    return finish(
      errorResponse(
        ErrorCode.UPSTREAM_TWILIO_ERROR,
        500,
        requestId,
        "Webhook not properly configured."
      ),
      ErrorCode.UPSTREAM_TWILIO_ERROR,
    );
  }

  // ── 3. Read raw body ONCE — before any await that could drain the stream ────
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, string> = {};
  params.forEach((value, key) => { payload[key] = value; });
  // Safe log context (NO PII)
  const safeCtx = {
    requestId,
    messageSid: payload["MessageSid"] ?? undefined,
    accountSid: payload["AccountSid"] ?? undefined,
    hasBody: !!payload["Body"],
  };

  // Log early context
  logger.info('webhook_payload_received', {
    requestId,
    hasSid: !!payload["MessageSid"],
    hasTo: !!payload["To"],
  });

  // ── 4. Signature verification — always mandatory, no bypass ────────────────
  const signatureValid = verifyTwilioRequest(request, rawBody, payload);
  if (!signatureValid) {
    logger.warn("Webhook rejected: invalid or missing Twilio signature", {
      event: "webhook_invalid_signature",
      ...safeCtx,
    });
    return finish(errorResponse(ErrorCode.FORBIDDEN, 401, requestId, "Invalid signature."), ErrorCode.FORBIDDEN);
  }

  // ── 5. Circuit breaker ─────────────────────────────────────────────────────
  if (isCircuitOpen()) {
    logger.warn("Webhook blocked: circuit breaker is OPEN", {
      event: "webhook_circuit_open",
      ...safeCtx,
    });
    return finish(twimlOk(CIRCUIT_FALLBACK_MESSAGE, requestId), 'CIRCUIT_OPEN');
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
      return finish(
        errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, "Invalid payload: MessageSid is required."),
        ErrorCode.VALIDATION_ERROR,
      );
    }

    // ── 7. Resolve tenant EARLY — needed for per-tenant rate limit ───────────
    const twilioNumberRaw = payload["To"];
    if (!twilioNumberRaw) {
      logger.warn("Webhook rejected: missing To field", {
        event: "webhook_missing_to",
        ...safeCtx,
      });
      return finish(twimlOk("Erro interno: payload inválido.", requestId), ErrorCode.VALIDATION_ERROR);
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
        return finish(errorResponse(ErrorCode.FORBIDDEN, 403, requestId, "Tenant not found"), ErrorCode.FORBIDDEN);
      }
      logger.error("Tenant resolution failed", err as Error, {
        event: "webhook_tenant_resolution_error",
        ...safeCtx,
      });
      return finish(twimlOk("Serviço indisponível temporariamente.", requestId), ErrorCode.DB_ERROR);
    }

    const tenantId = tenant.id.toString();
    tenantIdForLog = tenantId;
    // Pre-compute hash from payload["From"] so rate-limit and idempotency logs
    // use a stable key before the full parse step.  The normalised form used for
    // DB storage is derived again from the parsed incomingMessage below.
    const phoneHash = normalizeAndHash(payload["From"] || "").hash;

    // ── 8. Rate limit (tenant + sender) ──────────────────────────────────────
    const twilioRateKey = `${tenantId}:${(payload["From"] || "").trim().toLowerCase() || "unknown"}`;
    const twilioRateDecision = await rateLimiter.limit('twilio', twilioRateKey, {
      windowSec: 60,
      max: 30,
    });
    if (!twilioRateDecision.allowed) {
      structuredLogger.warn('rate_limited', {
        requestId,
        route,
        tenantId,
        eventType: 'RATE_LIMITED',
        scope: 'twilio',
        keyHash: hashRateLimitKeyForLog(twilioRateKey),
        remaining: twilioRateDecision.remaining,
      });
      return finish(
        applyRateLimitHeaders(
          errorResponse(ErrorCode.RATE_LIMITED, 429, requestId, 'Rate limit exceeded'),
          twilioRateDecision,
        ),
        ErrorCode.RATE_LIMITED,
      );
    }

    // ── 9. Validate and sanitize payload ─────────────────────────────────────
    validateWebhookPayload(payload);

    const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
    incomingMessage.body = sanitizeMessage(incomingMessage.body);

    // Re-normalise from the parsed message body (may differ slightly from rawFrom).
    // We use phoneFromNormalized (from the "From" header) as the canonical DB value
    // because incomingMessage.from could carry the same whitespace/case variations.
    const fromNormalized = normalizeAndHash(incomingMessage.from).normalized;
    if (!isValidPhone(fromNormalized)) {
      logger.warn("Webhook rejected: invalid From number format", {
        event: "webhook_invalid_from",
        tenantId,
        ...safeCtx,
      });
      return finish(twimlOk("Número inválido. Tente novamente.", requestId), ErrorCode.VALIDATION_ERROR);
    }

    // ── 10. DB idempotency guard (authoritative replay protection) ───────────
    const dedupAcquired = await inboundMessageDedupRepository.tryAcquire(messageSid, tenantId);
    if (!dedupAcquired) {
      structuredLogger.info('webhook_duplicate_db_dedup', {
        requestId,
        route,
        tenantId,
        eventType: 'webhook_duplicate',
        durationMs: Date.now() - startTime,
      });
      return finish(twimlEmpty(requestId), 'DUPLICATE_DB_DEDUP');
    }

    // ── 11. Persist inbound message (sanitized, no PII in payload) ───────────
    const messageText = incomingMessage.body ?? "";
    const intentResult = intentClassifier.classify(messageText);
    const intent = intentResult.intent;
    const confidence = intentResult.confidence;
    let inboundAttribution: AttributionSnapshot | null = null;

    const attributionToken = extractAttributionTokenFromText(messageText);
    if (attributionToken) {
      const consumed = await attributionClickRepository.consumeByToken(attributionToken, {
        requestId,
        tenantId,
      });
      if (consumed?.attribution) {
        inboundAttribution = consumed.attribution;

        const existingSession = await sessionManager.getSession(tenantId, fromNormalized);
        if (existingSession) {
          await sessionManager.updateSession(tenantId, fromNormalized, {
            attribution: consumed.attribution,
          });
        }
      }
    }

    const sanitizedPayload = {
      MessageSid: payload["MessageSid"],
      AccountSid: payload["AccountSid"],
      MessagingServiceSid: payload["MessagingServiceSid"],
      NumMedia: payload["NumMedia"],
      intent,
      confidence,
    };

    const confidenceDecimal = typeof confidence === 'number' ? confidence.toFixed(4) : null;

    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      tenantId,
      fromPhone: fromNormalized,
      toPhone: payload["To"] || null,
      body: incomingMessage.body,
      direction: "inbound",
      intent,
      intentConfidence: confidenceDecimal,
      rawPayload: JSON.stringify(sanitizedPayload),
    });

    // ── 11b. Update context cache (fire-and-forget, non-blocking) ─────────────
    // Keeps the Redis snapshot fresh so Frank has conversation history on the
    // next request without hitting the DB.  Failures are silently swallowed
    // inside appendMessage — they must never break the webhook flow.
    void appendMessage(tenantId, phoneHash, {
      body: messageText,
      direction: "inbound",
      intent,
      intentConfidence: (typeof confidence === 'number' ? confidence : null),
      createdAt: new Date().toISOString(),
    });

    // ── 12. Business logic ────────────────────────────────────────────────────
    logger.debug("Delegating to FreightController (state machine)");
    const replyMessage = await freightController.handleIncoming(
      tenantId,
      fromNormalized,
      messageText,
      messageSid,
      inboundAttribution,
      requestId,
    );

    const latencyMs = Date.now() - startTime;

    if (intent !== "UNKNOWN") {
      void aiDecisionLogRepository.saveDecisionLog({
        tenantId,
        messageId: messageSid,
        providerEventId: messageSid,
        provider: "intent_classifier",
        model: "rules-v1",
        intent,
        confidence,
        responseType: "twiml_ok",
        latencyMs,
      });
    }

    // ── 13. Structured audit log ──────────────────────────────────────────────
    logger.info("Webhook processed", {
      event: "webhook_processed",
      tenantId,
      phoneHash,
      providerEventId: messageSid,
      intent,
      confidence,
      state: "handled",
      responseType: "twiml_ok",
      latencyMs,
    });

    // Circuit breaker: mark success
    recordSuccess();
    const successLatencyMs = Date.now() - startTime;
    logger.info('webhook_request_end', {
      requestId,
      status: 200,
      latencyMs: successLatencyMs,
      tenantId,
    });

    return finish(twimlOk(replyMessage, requestId));
  } catch (err) {
    const errorLatencyMs = Date.now() - startTime;

    logger.error("Webhook processing failed", err as Error, {
      event: "webhook_error",
      latencyMs: errorLatencyMs,
      ...safeCtx,
    });

    // Circuit breaker: mark failure
    recordFailure();

    logger.info('webhook_request_end', {
      requestId,
      status: 200,
      latencyMs: errorLatencyMs,
    });

    structuredLogger.error('webhook_route_error', {
      requestId,
      tenantId: tenantIdForLog,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startTime,
      errorCode: ErrorCode.UNKNOWN,
      error: err,
    });

    return finish(twimlOk("Desculpe, ocorreu um erro. Tente novamente mais tarde.", requestId), ErrorCode.UNKNOWN);
  }
}

// ─── GET /api/webhook ─────────────────────────────────────────────────────────

/**
 * Minimal liveness check (use /api/internal/health/webhook for deep health).
 */
export async function GET(request: NextRequest) {
  const requestId = makeRequestId(request);
  const response = NextResponse.json(
    {
      status: "ok",
      service: "lojacond-frete-automacao",
      timestamp: new Date().toISOString(),
    }
  );
  return attachRequestIdHeader(response, requestId);
}
