import { inboundMessageDedupRepository } from '@/infra/repositories/inbound-message-dedup.repository';
import { messageRepository } from '@/infra/repositories/message.repository';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';
import { webhookEventRepository } from '@/infra/repositories/webhook-event.repository';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { encryptString } from '@/infra/pii/crypto';
import { sanitizeMessage } from '@/lib/validation';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { catalogService } from '@/modules/catalog/catalog.service';
import { resolveCustomerByPhone } from '@/modules/customers/identity-resolver/identity-resolver.service';
import { customerResolutionService } from '@/modules/customers/customer-resolution.service';
import { freightService } from '@/modules/freight/freight.service';
import { resolveEntities } from '@/modules/frank/entity-resolver';
import { resolveIntent, resolveContextualIntent, type SessionAnchors, type Intent } from '@/modules/frank/intent-resolver';
import { getSessionState, createSessionState, updateSessionState } from '@/modules/frank/session.repository';
import { resolveConversationMode, isEntitiesCompleteForIntent } from '@/modules/frank/conversation-control';
import { evaluateAutoResponseGuard } from '@/modules/frank/auto-response-guard';
import { messageService } from '@/modules/atendimento/message.service';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { findOrderWithShipmentByPrefix } from '@/modules/pedidos/server';
import { structuredLogger } from '@/infra/log/logger';
import { logger } from '@/infra/logger';
import { resolveInboundReplyPolicy, InboundReplyPolicy } from './whatsapp-reply-policy';
import {
    formatFreightQuoteResponse,
    formatProductInquiryResponse,
    formatProductSuggestionsResponse,
} from '@/lib/formatters/whatsapp-response';

export interface WebhookOrchestratorPayload {
    tenantId: string;
    messageSid: string;
    accountSid: string;
    fromE164: string;
    fromHash: string;
    toPhone: string;
    rawBodyText: string;
    requestId: string;
    profileName?: string;
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

function extractProductQuery(message: string, entities: ReturnType<typeof resolveEntities>['entities']): string {
    if (entities.product?.trim()) {
        return entities.product.trim();
    }
    const normalized = normalizeText(message);
    const nounMatch = normalized.match(
        /\b(carrinho(?:s)?|lixeira(?:s)?|container(?:es)?|contentor(?:es)?|caixa(?:s)?|pallet(?:s)?)\b/,
    );
    if (!nounMatch?.[1]) {
        return '';
    }
    const baseNoun = nounMatch[1].replace(/s$/, '');
    return entities.volume ? `${baseNoun} ${entities.volume}` : baseNoun;
}

function resolveQuantity(message: string, fallback: number | null): number {
    if (fallback && fallback > 0) return fallback;
    const explicitMatch = normalizeText(message).match(
        /\b(\d+)\s+(?:unidade|unidades|peca|pecas|item|itens|carrinho|carrinhos|lixeira|lixeiras|container|containers)\b/,
    );
    if (!explicitMatch) return 1;
    const quantity = Number(explicitMatch[1]);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function resolveSuggestionIntent(intent: string, hasSingleProduct: boolean, hasFreightQuote: boolean): string {
    if (hasFreightQuote) return 'FRETE';
    if (hasSingleProduct) {
        return intent === 'OUTRO' || intent === 'GENERIC_QUESTION' ? 'PRODUTO' : intent;
    }
    return intent;
}

export const whatsappInboundOrchestrator = {
    async process(payload: WebhookOrchestratorPayload): Promise<InboundReplyPolicy> {
        const { tenantId, messageSid, accountSid, fromE164, fromHash, toPhone, rawBodyText, requestId } = payload;
        const processingStartTime = Date.now();
        
        structuredLogger.info('whatsapp_orchestrator_step', { step: 'entrada_process', tenantId, messageSid, requestId, fromHash });

        // 1. Deduplication Lock
        const dedupAcquired = await inboundMessageDedupRepository.tryAcquire(messageSid, tenantId);
        if (!dedupAcquired) {
            structuredLogger.info('whatsapp_webhook_dedupe_hit', { tenantId, messageSid, requestId });
            return { type: 'ACK_ONLY' };
        }

        const messageText = sanitizeMessage(rawBodyText);

        // 2. LGPD Consent Check
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
                    messageSid, tenantId, fromPhone: fromE164, toPhone,
                    body: '[CONTEÚDO BLOQUEADO - AGUARDANDO CONSENTIMENTO LGPD]',
                    direction: 'inbound', intent: 'UNKNOWN', intentConfidence: null,
                    rawPayload: JSON.stringify({ MessageSid: messageSid, blocked: true, reason: 'lgpd' }),
                });

                void webhookEventRepository.markProcessed('twilio_frank', messageSid);
                
                return resolveInboundReplyPolicy({
                    tenantId, phoneHash: fromHash, conversationState: 'new',
                    hasConsent: false, productDetected: false, hasActiveSuggestion: false, intent: 'UNKNOWN'
                });
            }
        }

        // 3. Central Customer Resolution (Find or Create)
        structuredLogger.info('whatsapp_orchestrator_step', { step: 'iniciando_resolucao_customer', tenantId, messageSid, requestId, fromHash });
        const contactName = payload.profileName || 'Novo Lead WhatsApp';
        const identity = await customerResolutionService.resolveOrCreateCustomer(tenantId, fromE164, contactName);
        structuredLogger.info('whatsapp_orchestrator_step', { step: 'customer_resolvido', tenantId, messageSid, requestId, customerId: identity.customerId });
        
        if (identity.isNew) {
            structuredLogger.info('new_lead_captured', {
                tenantId, phoneHash: fromHash, customerId: identity.customerId, organizationId: identity.organizationId, eventType: 'new_lead_captured',
            });
            await publishOperationalEvent({
                tenantId, eventType: 'new_lead_captured', eventDomain: 'ACQUISITION',
                customerId: identity.customerId, sessionId: fromHash,
                payload: { contactId: identity.contactId, organizationId: identity.organizationId, customerId: identity.customerId, source: 'whatsapp', nameFallback: contactName },
            });
        } else {
            structuredLogger.info('customer_matched_to_conversation', {
                tenantId, phoneHash: fromHash, contactId: identity.contactId, organizationId: identity.organizationId, customerId: identity.customerId, eventType: 'customer_matched_to_conversation',
            });
            await publishOperationalEvent({
                tenantId, eventType: 'customer_matched_to_conversation', eventDomain: 'OPERATIONS',
                customerId: identity.customerId, sessionId: fromHash,
                payload: { contactId: identity.contactId, organizationId: identity.organizationId, customerId: identity.customerId },
            });
        }

        structuredLogger.info('whatsapp_orchestrator_step', { step: 'iniciando_resolucao_conversation', tenantId, messageSid, requestId, fromHash });
        const conversation = await conversationService.findOrCreateConversationByPhone(
            tenantId, fromHash, encryptString(fromE164), 
            { customerId: identity.customerId, organizationId: identity.organizationId }
        );
        structuredLogger.info('whatsapp_orchestrator_step', { step: 'conversation_resolvida', tenantId, messageSid, requestId, conversationId: conversation.id });

        if (conversation.status === 'operator_active') {
            structuredLogger.info('whatsapp_orchestrator_step', { step: 'iniciando_persist_message_operator', tenantId, messageSid, requestId, conversationId: conversation.id });
            await messageService.processInbound({
                tenantId,
                conversationId: conversation.id,
                messageSid,
                fromPhone: fromE164,
                toPhone,
                message: messageText,
                intent: 'UNKNOWN',
                intentConfidence: null,
                rawPayload: JSON.stringify({ MessageSid: messageSid, AccountSid: accountSid, intent: 'UNKNOWN' }),
                metadata: { MessageSid: messageSid, AccountSid: accountSid, contactId: identity?.contactId ?? null, customerId: identity?.customerId ?? null, organizationId: identity?.organizationId ?? null, unidentified: !identity, skippedAi: true },
                customerId: identity?.customerId ?? undefined,
                organizationId: identity?.organizationId ?? undefined,
                contactId: identity?.contactId ?? undefined
            });


            void webhookEventRepository.markProcessed('twilio_frank', messageSid);
            return resolveInboundReplyPolicy({
                tenantId, phoneHash: fromHash, conversationState: conversation.status as any,
                hasConsent: true, productDetected: false, hasActiveSuggestion: false, intent: 'UNKNOWN'
            });
        }

        // 4. NLP Intent Context & Resolution
        const sessionState = await getSessionState(tenantId, fromHash);
        
        let sessionAnchors: SessionAnchors | null = null;
        let autoResponsesCount = 0;
        
        if (sessionState) {
            autoResponsesCount = sessionState.autoResponsesCount;
            sessionAnchors = {
                lastReferencedOrderId: sessionState.lastOrderId,
                lastReferencedShipmentId: sessionState.lastReferencedShipmentId,
                lastReferencedQuoteId: sessionState.lastReferencedQuoteId,
                lastReferencedCustomerId: sessionState.lastReferencedCustomerId,
                previousIntent: (sessionState.currentIntent as Intent) || null,
                lastToolUsed: sessionState.lastToolUsed,
            };
        }

        const intentResult = resolveContextualIntent(messageText, sessionAnchors);
        
        structuredLogger.info('whatsapp_orchestrator_intent_resolved', {
            tenantId,
            messageSid,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            hasSessionContext: Boolean(sessionState)
        });

        structuredLogger.info('whatsapp_orchestrator_step', { step: 'iniciando_persist_message_bot', tenantId, messageSid, requestId, conversationId: conversation.id });
        await messageService.processInbound({
            tenantId,
            conversationId: conversation.id,
            messageSid,
            fromPhone: fromE164,
            toPhone,
            message: messageText,
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence > 0 ? intentResult.confidence : null,
            rawPayload: JSON.stringify({ MessageSid: messageSid, AccountSid: accountSid, intent: intentResult.intent, confidence: intentResult.confidence }),
            metadata: { MessageSid: messageSid, AccountSid: accountSid, contactId: identity?.contactId ?? null, customerId: identity?.customerId ?? null, organizationId: identity?.organizationId ?? null, unidentified: !identity },
            customerId: identity?.customerId ?? undefined,
            organizationId: identity?.organizationId ?? undefined,
            contactId: identity?.contactId ?? undefined
        });

        structuredLogger.info('whatsapp_orchestrator_message_persisted', {
            tenantId,
            conversationId: conversation.id,
            messageSid,
            intent: intentResult.intent
        });

        // 5. Entity Extraction
        const entityResult = resolveEntities(messageText);
        const destinationZip = extractCep(messageText);
        const productQuery = extractProductQuery(messageText, entityResult.entities);
        const quantity = resolveQuantity(messageText, entityResult.entities.quantity);

        // 5.5 Resolve Actual Order and Shipment Anchors
        let validOrderId: string | undefined = undefined;
        let validShipmentId: string | undefined = undefined;

        if (entityResult.entities.orderId) {
            try {
                const orderData = await findOrderWithShipmentByPrefix(
                    tenantId, 
                    entityResult.entities.orderId,
                    identity?.customerId || undefined
                );
                
                if (orderData) {
                    validOrderId = orderData.orderId;
                    if (orderData.shipmentId) {
                        validShipmentId = orderData.shipmentId;
                    }
                }
            } catch (error) {
                logger.warn('whatsapp_orchestrator_order_resolution_failed', { 
                    tenantId, 
                    orderId: entityResult.entities.orderId, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }

        let createdSuggestion = false;

        // 6. Supervised AI Routing (Catalog & Freight)
        if (productQuery) {
            const products = await catalogService.searchProductsByName(tenantId, productQuery);
            const primaryProduct = products[0] ?? null;

            if (primaryProduct) {
                await publishOperationalEvent({
                    tenantId, eventType: 'product_detected', eventDomain: 'OPERATIONS',
                    customerId: identity?.customerId ?? null, sessionId: fromHash, entityId: conversation.id,
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
                        tenantId, productId: primaryProduct.productId, quantity,
                        destinationZip, unitWeight: primaryProduct.weight,
                    });
                    suggestedResponse = `${suggestedResponse}\n\n${formatFreightQuoteResponse({
                        destinationZip, freightPrice: freightQuote.freightPrice, estimatedDays: freightQuote.estimatedDays, carrier: freightQuote.carrier,
                    })}`;
                    freightQuoted = true;
                    
                    await publishOperationalEvent({
                        tenantId, eventType: 'freight_quoted', eventDomain: 'OPERATIONS',
                        customerId: identity?.customerId ?? null, sessionId: fromHash, entityId: conversation.id,
                        payload: { conversationId: conversation.id, productId: primaryProduct.productId, quantity, destinationZip, freightPrice: freightQuote.freightPrice, estimatedDays: freightQuote.estimatedDays, carrier: freightQuote.carrier },
                    });
                } catch (error) {
                    logger.warn('whatsapp_freight_simulation_failed', { requestId, tenantId, destinationZip, error: error instanceof Error ? error.message : String(error) });
                }
            }

            const suggestionId = await suggestionService.generateSuggestion(tenantId, fromHash, {
                conversationId: conversation.id,
                intent: resolveSuggestionIntent(intentResult.intent, products.length === 1, freightQuoted),
                entities: { ...entityResult.entities, productQuery, productId: primaryProduct?.productId ?? null, destinationZip, quantity },
                suggestedResponse,
                confidence: Math.max(intentResult.confidence, products.length > 0 ? 0.85 : 0.7),
            });

            await publishOperationalEvent({
                tenantId, eventType: 'suggestion_created', eventDomain: 'OPERATIONS',
                customerId: identity?.customerId ?? null, sessionId: fromHash, entityId: conversation.id,
                payload: { conversationId: conversation.id, suggestionId, supervised: true, productMatches: products.length },
            });
            
            createdSuggestion = true;
        }

        // 6.5 Persist Contextual Signals
        // Reset count if the operator has been actively chatting in the previous 15m.
        // Otherwise, increment if we are sending an AUTO_REPLY.
        const operatorRespondedRecently = await conversationService.hasRecentOperatorMessage(tenantId, conversation.id, 15);
        if (operatorRespondedRecently) {
            autoResponsesCount = 0;
        }

        const entitiesComplete = isEntitiesCompleteForIntent(intentResult.intent, {
            destinationZip,
            productQuery,
            quantity
        });

        if (!entitiesComplete) {
            logger.info('whatsapp_incomplete_entities', {
                tenantId,
                conversationId: conversation.id,
                intent: intentResult.intent,
                destinationZip,
                productQuery,
                quantity
            });
        }
        const gateResult = resolveConversationMode({
            intent: intentResult.intent,
            entities: entityResult.entities, 
            confidence: intentResult.confidence,
            timestamp: new Date(),
            operatorOnline: Boolean(conversation.assignedTo) || operatorRespondedRecently,
            entitiesComplete,
            autoResponsesCount,
            messageBody: messageText
        });

        const guardResult = evaluateAutoResponseGuard(gateResult.mode, {
            autoResponsesCount,
            assignedTo: conversation.assignedTo,
            status: conversation.status,
            operatorRespondedRecently
        });

        if (guardResult.blocked) {
            gateResult.mode = guardResult.forcedMode!;
            gateResult.reason = guardResult.reason!;
            
            structuredLogger.info('whatsapp_auto_response_blocked', {
                tenantId,
                conversationId: conversation.id,
                reason: guardResult.reason,
                autoResponsesCount,
                requestId
            });
        }

        // 8. Policy Resolution
        const policyResolution = resolveInboundReplyPolicy({
            tenantId,
            phoneHash: fromHash,
            conversationState: conversation.status as any,
            hasConsent: true, // we checked it above
            productDetected: Boolean(productQuery),
            hasActiveSuggestion: createdSuggestion,
            intent: intentResult.intent
        });

        // Determine if we are incrementing the counter due to an outbound auto-reply taking place
        const shouldIncrementCounter = !guardResult.blocked && policyResolution.type === 'AUTO_REPLY_ALLOWED';

        const updateParams = {
            currentIntent: intentResult.intent,
            lastToolUsed: createdSuggestion ? 'freight_simulation_tool' : undefined,
            ...(validOrderId ? { lastOrderId: validOrderId } : {}),
            ...(validShipmentId ? { lastReferencedShipmentId: validShipmentId } : {}),
            autoResponsesCount: shouldIncrementCounter ? autoResponsesCount + 1 : autoResponsesCount,
            ...(shouldIncrementCounter ? { lastAutoResponseAt: new Date() } : {})
        };

        if (sessionState) {
            await updateSessionState(tenantId, fromHash, updateParams);
        } else {
            await createSessionState(tenantId, fromHash, updateParams);
        }

        void webhookEventRepository.markProcessed('twilio_frank', messageSid);

        // Override policy if gate mode strictly requires SUPERVISED
        // and policy was going to permit auto-reply.
        if (gateResult.mode === 'SUPERVISED' && policyResolution.type === 'AUTO_REPLY_ALLOWED') {
            const supervisedPolicy: InboundReplyPolicy = { type: 'SUPERVISED_NO_REPLY' };
            
            structuredLogger.info('whatsapp_orchestrator_latency', {
                tenantId,
                messageSid,
                requestId,
                durationMs: Date.now() - processingStartTime,
                intent: intentResult.intent,
                policy: supervisedPolicy.type,
                gateMode: gateResult.mode,
                hasSuggestion: createdSuggestion
            });

            return supervisedPolicy;
        }

        structuredLogger.info('whatsapp_orchestrator_latency', {
            tenantId,
            messageSid,
            requestId,
            durationMs: Date.now() - processingStartTime,
            intent: intentResult.intent,
            policy: policyResolution.type,
            gateMode: gateResult.mode,
            hasSuggestion: createdSuggestion
        });

        return policyResolution;
    }
};
