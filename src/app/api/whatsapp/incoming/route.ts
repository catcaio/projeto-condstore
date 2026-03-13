export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
import { phoneHash } from '@/lib/phone';
import { normalizePhone, toWhatsAppPhone } from '@/lib/phone/normalize-phone';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { webhookEventRepository, hashPayload } from '@/infra/repositories/webhook-event.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { resolveEntities } from '@/modules/frank/entity-resolver';
import { resolveIntent } from '@/modules/frank/intent-resolver';
import { encryptString } from '@/infra/pii/crypto';
import { resolveCustomerByPhone } from '@/modules/customers/identity-resolver/identity-resolver.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import { formatFreightQuoteResponse, formatProductInquiryResponse, formatProductSuggestionsResponse } from '@/lib/formatters/whatsapp-response';

function twimlOk(message: string, requestId?: string): NextResponse {
    const twiml = twilioProvider.generateTwiMLResponse(message);
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse(twiml, { status: 200, headers });
}

function twimlEmpty(requestId?: string): NextResponse {
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { status: 200, headers });
}

function extractCep(message: string): string | null {
    const match = message.match(/\b(\d{5}-?\d{3})\b/);
    return match ? match[1].replace(/\D/g, '') : null;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function extractProductQuery(
    message: string,
    entities: ReturnType<typeof resolveEntities>['entities'],
): string {
    if (entities.product?.trim()) {
        return entities.product.trim();
    }

    const normalized = normalizeText(message);
    const nounMatch = normalized.match(/\b(carrinho(?:s)?|lixeira(?:s)?|container(?:es)?|contentor(?:es)?|caixa(?:s)?|pallet(?:s)?)\b/);

    if (!nounMatch?.[1]) {
        return '';
    }

    const baseNoun = nounMatch[1].replace(/s$/, '');
    return entities.volume ? `${baseNoun} ${entities.volume}` : baseNoun;
}

function resolveQuantity(message: string, fallback: number | null): number {
    if (fallback && fallback > 0) {
        return fallback;
    }

    const explicitMatch = normalizeText(message).match(/\b(\d+)\s+(?:unidade|unidades|peca|pecas|item|itens|carrinho|carrinhos|lixeira|lixeiras|container|containers)\b/);
    if (!explicitMatch) {
        return 1;
    }

    const quantity = Number(explicitMatch[1]);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function resolveSuggestionIntent(intent: string, hasSingleProduct: boolean, hasFreightQuote: boolean): string {
    if (hasFreightQuote) {
        return 'FRETE';
    }

    if (hasSingleProduct) {
        return intent === 'OUTRO' || intent === 'GENERIC_QUESTION' ? 'PRODUTO' : intent;
    }

    return intent;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/whatsapp/incoming';

    structuredLogger.info('whatsapp_incoming_start', { requestId, route, eventType: 'route_start' });

    const finish = (response: NextResponse) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('whatsapp_incoming_end', {
            requestId,
            route,
            eventType: 'route_end',
            durationMs: Date.now() - startTime,
            status: response.status,
        });
        return response;
    };

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        return finish(errorResponse(ErrorCode.VALIDATION_ERROR, 415, requestId, 'Use application/x-www-form-urlencoded'));
    }

    if (!process.env.TWILIO_AUTH_TOKEN) {
        logger.error('TWILIO_AUTH_TOKEN not set', new Error('Missing TWILIO_AUTH_TOKEN'), { requestId });
        return finish(errorResponse(ErrorCode.UPSTREAM_TWILIO_ERROR, 500, requestId, 'Webhook not configured'));
    }

    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
        payload[key] = value;
    });

    const signatureValid = verifyTwilioSignature(request, rawBody, payload);
    if (!signatureValid) {
        logger.warn('whatsapp_incoming_invalid_signature', { requestId });
        return finish(errorResponse(ErrorCode.FORBIDDEN, 401, requestId, 'Invalid signature'));
    }

    const messageSid = payload['MessageSid'];
    if (!messageSid) {
        return finish(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing MessageSid'));
    }

    try {
        const pHash = hashPayload(rawBody);
        const dedupeResult = await registerWebhookEvent('twilio_frank', messageSid, 'message', pHash, requestId);
        if (dedupeResult === 'duplicate_event') {
            return finish(twimlEmpty(requestId));
        }

        const twilioNumberRaw = payload['To'];
        if (!twilioNumberRaw) {
            return finish(twimlOk('Erro interno: payload incompleto.', requestId));
        }

        let tenant;
        try {
            tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
        } catch (err) {
            structuredLogger.error('whatsapp_incoming_tenant_error', {
                errorType: err instanceof Error ? err.name : 'UnknownError',
                errorMessage: err instanceof Error ? err.message : String(err),
                route: '/api/whatsapp/incoming',
                requestId
            });
            return finish(twimlOk('Serviço indisponível.', requestId));
        }
        const tenantId = tenant.id.toString();

        const dedupAcquired = await inboundMessageDedupRepository.tryAcquire(messageSid, tenantId);
        if (!dedupAcquired) {
            return finish(twimlEmpty(requestId));
        }

        validateWebhookPayload(payload);
        const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
        incomingMessage.body = sanitizeMessage(incomingMessage.body);

        const fromE164 = normalizePhone(incomingMessage.from);
        const fromChannelAddress = toWhatsAppPhone(incomingMessage.from);

        if (!fromE164 || !fromChannelAddress) {
            return finish(twimlOk('Número inválido.', requestId));
        }

        const fromHash = phoneHash(fromChannelAddress);
        const messageText = incomingMessage.body ?? '';
        const userConsent = await endUserConsentRepository.getConsent(tenantId, fromHash);
        const hasConsent = userConsent?.consentGiven === true;

        if (!hasConsent) {
            const messageTextLower = messageText.toLowerCase().trim();
            const isAccepting = ['sim', 'aceito', 'concordo', 'ok', 'sim, eu aceito', 'yes'].includes(messageTextLower);

            if (isAccepting) {
                await endUserConsentRepository.recordOptIn(tenantId, fromHash, 'whatsapp_frank');
            } else {
                await endUserConsentRepository.incrementBlockedAttempts(tenantId, fromHash);
                await messageRepository.saveInboundMessage({
                    messageSid: incomingMessage.messageSid,
                    tenantId,
                    fromPhone: fromE164,
                    toPhone: payload['To'] || null,
                    body: '[CONTEÚDO BLOQUEADO - AGUARDANDO CONSENTIMENTO LGPD]',
                    direction: 'inbound',
                    intent: 'UNKNOWN',
                    intentConfidence: null,
                    rawPayload: JSON.stringify({ MessageSid: payload['MessageSid'], blocked: true, reason: 'lgpd' }),
                });

                void webhookEventRepository.markProcessed('twilio_frank', messageSid);
                return finish(twimlOk("Para continuar, confirme que aceita nossa política de privacidade enviando 'Sim' ou 'Aceito'.", requestId));
            }
        }

        const intentResult = resolveIntent(messageText);
        await messageRepository.saveInboundMessage({
            messageSid: incomingMessage.messageSid,
            tenantId,
            fromPhone: fromE164,
            toPhone: payload['To'] || null,
            body: messageText,
            direction: 'inbound',
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence > 0 ? intentResult.confidence.toFixed(4) : null,
            rawPayload: JSON.stringify({
                MessageSid: payload['MessageSid'],
                AccountSid: payload['AccountSid'],
                intent: intentResult.intent,
                confidence: intentResult.confidence,
            }),
        });

        const identity = await resolveCustomerByPhone(tenantId, fromE164);

        if (identity) {
            structuredLogger.info('customer_matched_to_conversation', {
                tenantId,
                phoneHash: fromHash,
                contactId: identity.contactId,
                organizationId: identity.organizationId,
                customerId: identity.customerId,
                eventType: 'customer_matched_to_conversation',
            });

            await publishOperationalEvent({
                tenantId,
                eventType: 'customer_matched_to_conversation',
                eventDomain: 'OPERATIONS',
                customerId: identity.customerId,
                sessionId: fromHash,
                payload: {
                    contactId: identity.contactId,
                    organizationId: identity.organizationId,
                    customerId: identity.customerId,
                    confidenceScore: identity.confidenceScore,
                },
            });
        } else {
            structuredLogger.info('customer_not_found', {
                tenantId,
                phoneHash: fromHash,
                eventType: 'customer_not_found',
            });
        }

        const { conversation } = await conversationService.processInboundMessage(
            tenantId,
            fromHash,
            encryptString(fromE164),
            messageText,
            undefined,
            identity?.organizationId ?? undefined,
            {
                MessageSid: payload['MessageSid'],
                AccountSid: payload['AccountSid'],
                contactId: identity?.contactId ?? null,
                customerId: identity?.customerId ?? null,
                organizationId: identity?.organizationId ?? null,
                unidentified: !identity,
            },
        );

        await publishOperationalEvent({
            tenantId,
            eventType: 'message_received',
            eventDomain: 'OPERATIONS',
            customerId: identity?.customerId ?? null,
            sessionId: fromHash,
            entityId: conversation.id,
            payload: {
                conversationId: conversation.id,
                channel: 'WHATSAPP',
                contactId: identity?.contactId ?? null,
                organizationId: identity?.organizationId ?? null,
                intent: intentResult.intent,
                unidentified: !identity,
            },
        });

        const entityResult = resolveEntities(messageText);
        const destinationZip = extractCep(messageText);
        const productQuery = extractProductQuery(messageText, entityResult.entities);
        const quantity = resolveQuantity(messageText, entityResult.entities.quantity);

        structuredLogger.info('whatsapp_message_received', {
            eventType: 'WHATSAPP_MESSAGE_RECEIVED',
            conversationId: conversation.id,
            phoneHash: fromHash,
            tenantId,
            intent: intentResult.intent,
            hasProductQuery: Boolean(productQuery),
            hasDestinationZip: Boolean(destinationZip),
            messagePreview: messageText ? messageText.slice(0, 50) : '[no_body]',
        });

        logger.info('whatsapp_incoming_human_routed', {
            requestId,
            tenantId,
            phoneHash: fromHash,
            hasBody: !!messageText,
            durationMs: Date.now() - startTime,
        });

        if (productQuery) {
            const products = await catalogService.searchProductsByName(tenantId, productQuery);
            const primaryProduct = products[0] ?? null;

            if (primaryProduct) {
                await publishOperationalEvent({
                    tenantId,
                    eventType: 'product_detected',
                    eventDomain: 'OPERATIONS',
                    customerId: identity?.customerId ?? null,
                    sessionId: fromHash,
                    entityId: conversation.id,
                    payload: { productId: primaryProduct.productId, matches: products.length, query: productQuery },
                });
            }

            let suggestedResponse = products.length === 1
                ? formatProductInquiryResponse(products[0])
                : formatProductSuggestionsResponse(products);

            let freightQuoted = false;
            if (products.length === 1 && destinationZip && quantity > 0 && primaryProduct) {
                try {
                    const freightQuote = await freightService.simulateFreightQuote({
                        tenantId,
                        productId: primaryProduct.productId,
                        quantity,
                        destinationZip,
                        unitWeight: primaryProduct.weight,
                    });

                    suggestedResponse = `${suggestedResponse}\n\n${formatFreightQuoteResponse({
                        destinationZip,
                        freightPrice: freightQuote.freightPrice,
                        estimatedDays: freightQuote.estimatedDays,
                        carrier: freightQuote.carrier,
                    })}`;

                    freightQuoted = true;
                    await publishOperationalEvent({
                        tenantId,
                        eventType: 'freight_quoted',
                        eventDomain: 'OPERATIONS',
                        customerId: identity?.customerId ?? null,
                        sessionId: fromHash,
                        entityId: conversation.id,
                        payload: {
                            conversationId: conversation.id,
                            productId: primaryProduct.productId,
                            quantity,
                            destinationZip,
                            freightPrice: freightQuote.freightPrice,
                            estimatedDays: freightQuote.estimatedDays,
                            carrier: freightQuote.carrier,
                        },
                    });
                } catch (error) {
                    logger.warn('whatsapp_freight_simulation_failed', {
                        requestId,
                        tenantId,
                        destinationZip,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            const suggestionId = await suggestionService.generateSuggestion(tenantId, fromHash, {
                conversationId: conversation.id,
                intent: resolveSuggestionIntent(intentResult.intent, products.length === 1, freightQuoted),
                entities: {
                    ...entityResult.entities,
                    productQuery,
                    productId: primaryProduct?.productId ?? null,
                    destinationZip,
                    quantity,
                },
                suggestedResponse,
                confidence: Math.max(intentResult.confidence, products.length > 0 ? 0.85 : 0.7),
            });

            await publishOperationalEvent({
                tenantId,
                eventType: 'suggestion_created',
                eventDomain: 'OPERATIONS',
                customerId: identity?.customerId ?? null,
                sessionId: fromHash,
                entityId: conversation.id,
                payload: {
                    conversationId: conversation.id,
                    suggestionId,
                    supervised: true,
                    productMatches: products.length,
                },
            });
        }

        void webhookEventRepository.markProcessed('twilio_frank', messageSid);
        return finish(twimlEmpty(requestId));
    } catch (err) {
        structuredLogger.error('whatsapp_incoming_error', {
            errorType: err instanceof Error ? err.name : 'UnknownError',
            errorMessage: err instanceof Error ? err.message : String(err),
            route: '/api/whatsapp/incoming',
            requestId,
        });
        return finish(twimlOk('Desculpe, ocorreu um erro. Tente novamente.', requestId));
    }
}
