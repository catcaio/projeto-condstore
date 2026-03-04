/**
 * Twilio WhatsApp Webhook — Hardened.
 *
 * Security order (fail-fast):
 *   1. Content-type guard
 *   2. TWILIO_AUTH_TOKEN presence (500 if missing — no bypass ever)
 *   3. Signature verification (401 if invalid)
 *   4. Circuit breaker check (200 TwiML fallback if open)
 *   5. Replay protection (clock-drift check)
 *   6. Rate limit (tenant+From, 30/60s) → 429 JSON if exceeded
 *   7. Payload validation (MessageSid required)
 *   8. Persistent webhook_events idempotency (provider + external_id)
 *   9. Idempotency (DB dedup): duplicate MessageSid → 200 TwiML empty no-op
 *  10. Tenant resolution
 *  11. Business logic (freight controller)
 *  12. Event Bus publish (events:webhook)
 *  13. Structured audit log
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
import { webhookEventRepository, hashPayload } from "../../../infra/repositories/webhook-event.repository";
import { endUserConsentRepository } from "../../../infra/repositories/end-user-consent.repository";
import { publishEvent } from "../../../core/events/event-bus";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum clock drift (in ms) before logging a replay warning (5 minutes). */
const REPLAY_DRIFT_WARN_MS = 5 * 60 * 1000;
/** Maximum clock drift (in ms) before hard-rejecting (15 minutes). */
const REPLAY_DRIFT_REJECT_MS = 15 * 60 * 1000;
/** Redis Stream for webhook events. */
const WEBHOOK_STREAM = 'events:webhook';

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

  // ── 4b. Replay protection (clock drift check) ─────────────────────────────
  const twilioTimestamp = request.headers.get('x-twilio-timestamp');
  if (twilioTimestamp) {
    const tMs = parseInt(twilioTimestamp, 10) * 1000;
    const drift = Math.abs(Date.now() - tMs);
    if (drift > REPLAY_DRIFT_REJECT_MS) {
      structuredLogger.warn('webhook_replay_rejected', {
        requestId,
        route,
        drift,
        eventType: 'webhook_replay_rejected',
      });
      return finish(
        errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Request timestamp too old — possible replay.'),
        ErrorCode.FORBIDDEN,
      );
    }
    if (drift > REPLAY_DRIFT_WARN_MS) {
      structuredLogger.warn('webhook_replay_clock_drift', {
        requestId,
        route,
        drift,
        eventType: 'webhook_replay_clock_drift',
      });
    }
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

    // ── 6b. Persistent webhook_events idempotency ─────────────────────────────
    const pHash = hashPayload(rawBody);
    const isNew = await webhookEventRepository.tryInsert({
      provider: 'twilio',
      externalId: messageSid,
      payloadHash: pHash,
    });
    if (!isNew) {
      structuredLogger.info('webhook_duplicate_persistent', {
        requestId,
        route,
        eventType: 'webhook_duplicate_persistent',
        provider: 'twilio',
        externalId: messageSid,
        durationMs: Date.now() - startTime,
      });
      return finish(twimlEmpty(requestId), 'DUPLICATE_WEBHOOK_EVENT');
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

    if (tenant.incidentMode) {
      logger.warn("Webhook bypass: tenant is in incident mode", {
        event: "webhook_tenant_incident_mode",
        tenantId: tenant.id,
        ...safeCtx,
      });
      return finish(twimlOk("Estamos passando por instabilidade, retornaremos em instantes.", requestId), 'INCIDENT_MODE_ACTIVE');
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

    // ── 11. LGPD Consent Wall & Persist inbound message ───────────
    const messageText = incomingMessage.body ?? "";

    const userConsent = await endUserConsentRepository.getConsent(tenantId, phoneHash);
    const hasConsent = userConsent?.consentGiven === true;

    if (!hasConsent) {
      const messageTextLower = messageText.toLowerCase().trim();
      const isAccepting = ['sim', 'aceito', 'concordo', 'ok', 'sim, eu aceito', 'yes'].includes(messageTextLower);

      if (isAccepting) {
        // Record opt-in
        await endUserConsentRepository.recordOptIn(tenantId, phoneHash, 'whatsapp');
        structuredLogger.info('lgpd_consent_granted', { tenantId, phoneHash, route, eventType: 'lgpd_consent_granted' });
        // Continue normal execution, treating this as a generic conversational start
      } else {
        // Reject ingestion
        await endUserConsentRepository.incrementBlockedAttempts(tenantId, phoneHash);
        structuredLogger.warn('lgpd_ingestion_blocked', { tenantId, phoneHash, reason: 'missing_consent', route, eventType: 'lgpd_ingestion_blocked' });
        const replyMessage = "Para continuar, confirme que aceita nossa política de privacidade enviando 'Sim' ou 'Aceito'.";

        // Save the inbound message, but strictly scrub the PII/body to prevent leaks into the DB
        await messageRepository.saveInboundMessage({
          messageSid: incomingMessage.messageSid,
          tenantId,
          fromPhone: fromNormalized,
          toPhone: payload["To"] || null,
          body: "[CONTEÚDO BLOQUEADO - AGUARDANDO CONSENTIMENTO LGPD]",
          direction: "inbound",
          intent: "UNKNOWN",
          intentConfidence: null,
          rawPayload: JSON.stringify({ MessageSid: payload["MessageSid"], blocked: true, reason: 'lgpd' }),
        });

        recordSuccess();
        void webhookEventRepository.markProcessed('twilio', messageSid);

        const blockLatencyMs = Date.now() - startTime;
        logger.info('webhook_request_end', {
          requestId,
          status: 200,
          latencyMs: blockLatencyMs,
          tenantId,
          blocked: true
        });
        return finish(twimlOk(replyMessage, requestId));
      }
    }

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

    // ── 12b. Publish to event bus (fire-and-forget, fallback below) ──────────
    try {
      await publishEvent({
        stream: WEBHOOK_STREAM,
        type: 'WEBHOOK_INBOUND',
        tenantId,
        data: {
          messageSid,
          phoneHash,
          intent,
          confidence,
        },
        requestId,
      });
    } catch (publishErr) {
      // Event bus publish failed — this is non-blocking. The webhook
      // already processed the message synchronously above.
      structuredLogger.warn('webhook_event_bus_publish_failed', {
        requestId,
        route,
        eventType: 'webhook_event_bus_publish_failed',
        error: publishErr,
      });
    }

    // ── 12d. Persist to domine_events for async audit trail (fire-and-forget) ──
    try {
      const { domineIntakeService } = await import('../../../domine/domine-intake.service');
      await domineIntakeService.publish({
        tenantId: 'LOJACOND',
        type: 'WEBHOOK_RECEIVED',
        source: 'webhook',
        payload: {
          source: 'twilio',
          providerEventId: messageSid,
          kind: intent,
          minimalData: { phoneHash, confidence },
        },
        idempotencyKey: `twilio:${messageSid}`,
      });
    } catch {
      // Non-blocking: intake failure must never break webhook response
    }

    // ── 12c. Mark webhook event as processed ─────────────────────────────
    void webhookEventRepository.markProcessed('twilio', messageSid);

    const successLatencyMs = Date.now() - startTime;
    logger.info('webhook_request_end', {
      requestId,
      status: 200,
      latencyMs: successLatencyMs,
      tenantId,
    });

    if (!replyMessage) {
      return finish(twimlEmpty(requestId));
    }

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

    // Mark webhook event as failed (best-effort, non-blocking)
    const failedSid = payload?.["MessageSid"];
    if (failedSid) {
      void webhookEventRepository.markFailed('twilio', failedSid);
    }

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
