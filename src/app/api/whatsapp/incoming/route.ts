/**
 * WhatsApp Incoming Webhook — Frank Auto-Quote.
 *
 * POST /api/whatsapp/incoming
 *
 * Security (fail-fast, mirrors /api/webhook):
 *   1. Content-type guard
 *   2. TWILIO_AUTH_TOKEN presence
 *   3. Signature verification
 *   4. Payload validation (MessageSid required)
 *   5. DB dedup (inbound_message_dedup)
 *   6. Tenant resolution
 *   7. Frank orchestrator → intent → auto-quote → TwiML
 *   8. Message persistence
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { twilioProvider } from '@/providers/twilio.provider';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { sanitizeMessage, validateWebhookPayload } from '@/lib/validation';
import { messageRepository } from '@/infra/repositories/message.repository';
import { tenantRepository } from '@/infra/repositories/tenant.repository';
import { verifyTwilioSignature } from '@/lib/security/webhook-verifier';
import { registerWebhookEvent } from '@/lib/security/webhook-dedupe';
import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { normalizeAndHash, isValidPhone } from '@/lib/phone';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { handleIncomingMessage } from '@/modules/frank/whatsapp-orchestrator';
import { webhookEventRepository, hashPayload } from '@/infra/repositories/webhook-event.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { supervisedAssistService } from '@/modules/frank/supervised-assist.service';
import { encryptString } from '@/infra/pii/crypto';

export const dynamic = 'force-dynamic';

// ─── TwiML helpers ────────────────────────────────────────────────────────────

function twimlOk(message: string, requestId?: string): NextResponse {
    const twiml = twilioProvider.generateTwiMLResponse(message);
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse(twiml, { status: 200, headers });
}

function twimlEmpty(requestId?: string): NextResponse {
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers },
    );
}

// ─── POST /api/whatsapp/incoming ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/whatsapp/incoming';

    structuredLogger.info('whatsapp_incoming_start', {
        requestId, route, eventType: 'route_start',
    });

    const finish = (response: NextResponse) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('whatsapp_incoming_end', {
            requestId, route, eventType: 'route_end',
            durationMs: Date.now() - startTime,
            status: response.status,
        });
        return response;
    };

    // ── 1. Content-type guard ─────────────────────────────────────────────────
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        return finish(
            errorResponse(ErrorCode.VALIDATION_ERROR, 415, requestId, 'Use application/x-www-form-urlencoded'),
        );
    }

    // ── 2. TWILIO_AUTH_TOKEN presence ──────────────────────────────────────────
    if (!process.env.TWILIO_AUTH_TOKEN) {
        logger.error('TWILIO_AUTH_TOKEN not set', new Error('Missing TWILIO_AUTH_TOKEN'), { requestId });
        return finish(
            errorResponse(ErrorCode.UPSTREAM_TWILIO_ERROR, 500, requestId, 'Webhook not configured'),
        );
    }

    // ── 3. Read body & verify signature ───────────────────────────────────────
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => { payload[key] = value; });

    const signatureValid = verifyTwilioSignature(request, rawBody, payload);
    if (!signatureValid) {
        logger.warn('whatsapp_incoming_invalid_signature', { requestId });
        return finish(errorResponse(ErrorCode.FORBIDDEN, 401, requestId, 'Invalid signature'));
    }

    // ── 4. Payload validation ─────────────────────────────────────────────────
    const messageSid = payload['MessageSid'];
    if (!messageSid) {
        return finish(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing MessageSid'));
    }

    try {
        // ── 5. Webhook event idempotency ──────────────────────────────────────
        const pHash = hashPayload(rawBody);
        const dedupeResult = await registerWebhookEvent('twilio_frank', messageSid, 'message', pHash, requestId);
        if (dedupeResult === 'duplicate_event') {
            return finish(twimlEmpty(requestId));
        }

        // ── 6. Tenant resolution ──────────────────────────────────────────────
        const twilioNumberRaw = payload['To'];
        if (!twilioNumberRaw) {
            return finish(twimlOk('Erro interno: payload incompleto.', requestId));
        }

        let tenant;
        try {
            tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
        } catch (err) {
            logger.error('whatsapp_incoming_tenant_error', err as Error, { requestId });
            return finish(twimlOk('Serviço indisponível.', requestId));
        }

        const tenantId = tenant.id.toString();

        // ── 7. DB dedup ───────────────────────────────────────────────────────
        const dedupAcquired = await inboundMessageDedupRepository.tryAcquire(messageSid, tenantId);
        if (!dedupAcquired) {
            return finish(twimlEmpty(requestId));
        }

        // ── 8. Parse & sanitize ───────────────────────────────────────────────
        validateWebhookPayload(payload);
        const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
        incomingMessage.body = sanitizeMessage(incomingMessage.body);

        const fromNormalized = normalizeAndHash(incomingMessage.from).normalized;
        const phoneHash = normalizeAndHash(incomingMessage.from).hash;

        if (!isValidPhone(fromNormalized)) {
            return finish(twimlOk('Número inválido.', requestId));
        }

        // ── 9. LGPD Consent Wall ──────────────────────────────────────────────
        const messageText = incomingMessage.body ?? '';
        const userConsent = await endUserConsentRepository.getConsent(tenantId, phoneHash);
        const hasConsent = userConsent?.consentGiven === true;

        if (!hasConsent) {
            const messageTextLower = messageText.toLowerCase().trim();
            const isAccepting = ['sim', 'aceito', 'concordo', 'ok', 'sim, eu aceito', 'yes'].includes(messageTextLower);

            if (isAccepting) {
                await endUserConsentRepository.recordOptIn(tenantId, phoneHash, 'whatsapp_frank');
                structuredLogger.info('lgpd_consent_granted', {
                    tenantId, phoneHash,
                    route: '/api/whatsapp/incoming',
                    eventType: 'lgpd_consent_granted',
                });
                // Fall through to normal processing
            } else {
                await endUserConsentRepository.incrementBlockedAttempts(tenantId, phoneHash);
                structuredLogger.warn('lgpd_ingestion_blocked', {
                    tenantId, phoneHash,
                    reason: 'missing_consent',
                    route: '/api/whatsapp/incoming',
                    eventType: 'lgpd_ingestion_blocked',
                });

                // Persist scrubbed inbound message
                await messageRepository.saveInboundMessage({
                    messageSid: incomingMessage.messageSid,
                    tenantId,
                    fromPhone: fromNormalized,
                    toPhone: payload['To'] || null,
                    body: '[CONTEÚDO BLOQUEADO - AGUARDANDO CONSENTIMENTO LGPD]',
                    direction: 'inbound',
                    intent: 'UNKNOWN',
                    intentConfidence: null,
                    rawPayload: JSON.stringify({ MessageSid: payload['MessageSid'], blocked: true, reason: 'lgpd' }),
                });

                void webhookEventRepository.markProcessed('twilio_frank', messageSid);

                return finish(twimlOk(
                    "Para continuar, confirme que aceita nossa política de privacidade enviando 'Sim' ou 'Aceito'.",
                    requestId,
                ));
            }
        }

        // ── 10. Human Inbox routing & Webhook ack ─────────────────────────────
        const { conversation } = await conversationService.processInboundMessage(
            tenantId,
            phoneHash,
            encryptString(fromNormalized),
            incomingMessage.body,
            tenant.id, // currently using tenant.id as customer fallback, or null if unlinked
            undefined, // organization
            {
                MessageSid: payload['MessageSid'],
                AccountSid: payload['AccountSid']
            }
        );

        // -- Generate passive suggestion --
        if (incomingMessage.body) {
            await supervisedAssistService.generatePassiveSuggestion(
                tenantId,
                conversation.id,
                phoneHash,
                incomingMessage.body
            ).catch(() => {});
        }

        // Mark webhook as processed
        void webhookEventRepository.markProcessed('twilio_frank', messageSid);

        logger.info('whatsapp_incoming_human_routed', {
            requestId, tenantId, phoneHash,
            hasBody: !!incomingMessage.body,
            durationMs: Date.now() - startTime,
        });

        // We return an empty TwiML because an operator will reply manually later.
        return finish(twimlEmpty(requestId));
    } catch (err) {
        logger.error('whatsapp_incoming_error', err as Error, { requestId });
        return finish(twimlOk('Desculpe, ocorreu um erro. Tente novamente.', requestId));
    }
}
