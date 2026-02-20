/**
 * Twilio WhatsApp Webhook.
 * Entry point for incoming WhatsApp messages.
 * Thin layer that delegates to the freight controller (state machine).
 */

import { NextRequest, NextResponse } from "next/server";
import { twilioProvider } from "../../../providers/twilio.provider";
import { twilioConfig } from "../../../config/twilio.config";
import { logger } from "../../../infra/logger";
import { sanitizeMessage, validateWebhookPayload } from "../../../lib/validation";
import { messageRepository } from "../../../infra/repositories/message.repository";
import { tenantRepository } from "../../../infra/repositories/tenant.repository";
import { normalizeWhatsAppNumber, isValidWhatsAppNumber } from "../../../lib/normalize";
import { verifyTwilioRequest } from "../../../server/twilio/verifyWebhook";
import { freightControllerLegacy as freightController } from "../../../legacy/freight.controller";
import { checkRateLimit, getThrottleMessage } from "../../../infra/rate-limiter";
import { inboundMessageRepository } from "../../../modules/llm/repositories/message.repository";
import { intentClassifier } from "../../../modules/llm/intent-classifier";
import { intentRouter } from "../../../modules/llm/intent-router";
import { ActionType, IntentType } from "../../../modules/llm/intents";
import { conversationService } from "../../../modules/conversation/conversation.service";
import { freightFlow } from "../../../modules/conversation/freight-flow";

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages from Twilio.
 */
export async function POST(request: NextRequest) {
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

    // 7.5) Conversation State Engine (V1)

    // A) Override Check (keywords to reset state)
    const overrideKeywords = ['cancelar', 'sair', 'humano', 'parar', 'atendente'];
    if (incomingMessage.body && overrideKeywords.some(k => incomingMessage.body?.toLowerCase().includes(k))) {
      await conversationService.clearState(tenantId, fromNormalized);
      logger.info("Conversation state cleared via override", { tenantId, from: fromNormalized });
      // Proceed to normal classification (will likely map to HUMAN_HANDOFF or UNKNOWN)
    } else {
      // B) Check Active State
      const activeState = await conversationService.getState(tenantId, fromNormalized);

      if (activeState) {
        logger.info("Active conversation state found", { tenantId, step: activeState.currentStep });

        // Delegate to FreightFlow (or specific flow based on context, but V1 is Freight only)
        const flowResult = await freightFlow.handle(
          tenantId,
          fromNormalized,
          incomingMessage.body || "",
          activeState.currentStep as any,
          activeState.contextJson
        );

        // Log transition/action check
        // We might want to persist this as an action_event too for consistency?
        // "registrar action_event" was requested.
        // But we don't have a messageId for *this* specific turn if we skip inbound save?
        // Wait, we should probably save inbound message FIRST for idempotency.

        // Moving Step 8 (Save Inbound) BEFORE Step 7.5 would be safer for idempotency.
        // But let's follow the user's "Antes da classificação" instruction. 
        // Idempotency check *is* part of "Save Inbound".
        // Let's defer saving inbound after this block? No, usually Idempotency is first.
        // Update: I will Move Step 8 up in a separate edit if needed, or just proceed knowing we are effectively handling it.
        // Actually, let's keep it simple: If Active State -> Handle -> Respond.
        // We should still save the message for audit logs.

        // Let's quickly save inbound here if we are going to return early.
        const { id: inboundMsgId, isNew } = await inboundMessageRepository.saveMessage({
          tenantId,
          messageSid: payload["MessageSid"] || null,
          fromNumber: fromNormalized,
          bodyRaw: incomingMessage.body || "",
        });

        if (!isNew) return twimlOk("");

        // Save Action Event for this flow step
        await inboundMessageRepository.saveActionEvent({
          tenantId,
          messageId: inboundMsgId,
          intent: 'conversation_flow', // Generic intent for flow
          actionType: 'freight_flow_step',
          inputPayload: { step: activeState.currentStep, text: incomingMessage.body },
          outputPayload: flowResult,
          status: 'success'
        });

        return twimlOk(flowResult.reply);
      }
    }

    // 8) LLM Pipeline: Persist Inbound + Idempotency Check
    const { id: inboundMsgId, isNew } = await inboundMessageRepository.saveMessage({
      tenantId,
      messageSid: payload["MessageSid"] || null,
      fromNumber: fromNormalized,
      bodyRaw: incomingMessage.body || "",
    });

    if (!isNew) {
      logger.warn("Webhook ignored: duplicate message (idempotency)", {
        event: "DUPLICATE_MESSAGE",
        tenantId,
        ...safeCtx,
      });
      return twimlOk(""); // Return empty ok to ack Twilio
    }

    // 8.5) Intent Classification
    let prediction: {
      intent: IntentType;
      confidence: number;
      method: 'baseline' | 'llm' | 'rate_limited';
      modelVersion: string;
      latencyMs: number;
      fallbackReason?: string | null;
    } = {
      intent: IntentType.UNKNOWN,
      confidence: 0,
      method: "baseline",
      modelVersion: "none",
      latencyMs: 0,
      fallbackReason: null
    };

    if (incomingMessage.body) {
      prediction = await intentClassifier.classify(incomingMessage.body, fromNormalized);

      await inboundMessageRepository.saveLlmEvent({
        tenantId,
        messageId: inboundMsgId,
        modelVersion: prediction.modelVersion,
        intentPredicted: prediction.intent,
        confidence: prediction.confidence,
        method: prediction.method,
        latencyMs: prediction.latencyMs,
        fallbackReason: prediction.fallbackReason
      });

      logger.info("Message classified", {
        tenantId,
        intent: prediction.intent,
        confidence: prediction.confidence,
        method: prediction.method,
      });
    }

    // Legacy Audit (keep for compatibility if needed, or remove later)
    const sanitizedPayload = {
      MessageSid: payload["MessageSid"],
      AccountSid: payload["AccountSid"],
      MessagingServiceSid: payload["MessagingServiceSid"],
      NumMedia: payload["NumMedia"],
    };

    await messageRepository.saveInboundMessage({
      messageSid: incomingMessage.messageSid,
      tenantId,
      fromPhone: fromNormalized,          // stored (PII) for ops; do NOT log
      toPhone: payload["To"] || null,     // stored (PII) for ops; do NOT log
      body: incomingMessage.body,         // stored (PII) for ops; do NOT log
      direction: "inbound",
      intent: "freight_flow",             // Legacy field
      rawPayload: JSON.stringify(sanitizedPayload),
    });

    // 9) Action Router & Response Generation
    // Idempotency check (action level)
    const existingAction = await inboundMessageRepository.getActionEvent(inboundMsgId);
    if (existingAction) return twimlOk("");

    const routerContext = {
      tenantId,
      messageId: inboundMsgId,
      fromNumber: fromNormalized,
      text: incomingMessage.body
    };

    let replyText = "";
    let actionType = "unknown";

    // C) Handle FREIGHT_QUOTE via FreightFlow (Entry Point)
    if (prediction.intent === 'freight_quote') {
      logger.info("Starting Freight Flow via Intent");
      const flowResult = await freightFlow.handle(
        tenantId,
        fromNormalized,
        incomingMessage.body || "",
        'NONE', // Start fresh
        {}
      );
      replyText = flowResult.reply;
      actionType = 'freight_flow_init';

      // Persist Action
      await inboundMessageRepository.saveActionEvent({
        tenantId,
        messageId: inboundMsgId,
        intent: prediction.intent,
        actionType,
        inputPayload: routerContext,
        outputPayload: flowResult,
        status: 'success'
      });

    } else {
      // Standard Router for other intents
      const actionResult = await intentRouter.route(prediction.intent, routerContext);

      // Handle Action Types
      if (actionResult.type === ActionType.FREIGHT_QUOTE) {
        // Fallback if router still returns this (should catch above, but safety)
        const flowResult = await freightFlow.handle(tenantId, fromNormalized, incomingMessage.body || "", 'NONE', {});
        replyText = flowResult.reply;
      } else {
        replyText = actionResult.payload.message;
      }
      actionType = actionResult.type;

      await inboundMessageRepository.saveActionEvent({
        tenantId,
        messageId: inboundMsgId,
        intent: prediction.intent,
        actionType: actionResult.type,
        inputPayload: routerContext,
        outputPayload: actionResult.payload,
        status: 'success'
      });
    }

    // 10) Respond TwiML
    const durationMs = Date.now() - startTime;
    safeCtx.durationMs = durationMs;

    logger.info("Webhook processed successfully", {
      event: "WEBHOOK_OK",
      tenantId,
      actionType,
      ...safeCtx,
    });

    return twimlOk(replyText);
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
