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
import { verifyTwilioSignature } from "../../../lib/security/webhook-verifier";
import { registerWebhookEvent } from "../../../lib/security/webhook-dedupe";
import { withDistributedLock } from "../../../lib/infra/locks";
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
  const requestId = makeRequestId(request);
  const route = '/api/webhook';

  structuredLogger.warn('legacy_webhook_accessed', {
    requestId,
    route,
    eventType: 'legacy_webhook_accessed',
    message: 'Legacy webhook endpoint requested. Redirecting client to /api/whatsapp/incoming.',
  });

  const response = NextResponse.json(
    {
      error: 'Endpoint legado substituído. Utilize /api/whatsapp/incoming',
      deprecated: true,
      statusCode: 410,
    },
    { status: 410 }
  );

  return attachRequestIdHeader(response, requestId);
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
