/**
 * Frank WhatsApp Orchestrator.
 *
 * Handles the incoming WhatsApp message flow:
 * 1. Resolve intent (FRETE/PRODUTO/PEDIDO/SAUDACAO/OUTRO)
 * 2. Extract CEP and productRef from message
 * 3. If FRETE + CEP + productRef → auto-quote via sales/quote pipeline
 * 4. Format and return response text
 */

import { resolveIntent, resolveContextualIntent, type Intent, type IntentResult, type SessionAnchors } from './intent-resolver';
import { resolveEntities, detectedEntityTypes, missingEntityTypes, type ExtractedEntities, type EntityResolutionResult } from './entity-resolver';
import { resolveConversationMode, type ConversationMode, type ConversationGateResult } from './conversation-control';
import { extractCep, extractCepRaw } from './cep-extractor';
import { resolveConversationContext, type ConversationContext } from './context-resolver';
import { resolvePlaybook, type ResolvedPlaybook } from './playbooks/playbook.service';
import { resolveKnowledge } from './knowledge/knowledge.service';
import { recordInboundMessage, recordOutboundMessage, loadConversationContext } from './memory/memory.service';
import { suggestionService } from './suggestions/suggestion.service';
import { isFrankRuntimeEnabled, isFrankSupervisedOnly } from '@/config/app.config';
import { intentTrainingService } from './intents/intent.service';
import { resolveProductFromUrl } from './product-resolver';
import { resolvePackingDimensions } from '@/modules/freight/packing-resolver';
import { TableDrivenAdapter } from '@/modules/freight/table-driven-adapter';
import { loadOperationalSettings } from '@/core/freight/operational-settings';
import { logFreightSimulation } from '@/modules/freight/freight-audit';
import { createOrderFromQuoteTool } from './tools/create-order-from-quote.tool';
import { isFrankAssistantMode } from './tools/tool-guard';
import { getCustomerContextTool } from './tools/read-only/getCustomerContext.tool';
import { getRecentOrdersTool, type RecentOrderSummary } from './tools/read-only/getRecentOrders.tool';
import { getOrderStatusTool, type OrderStatusResult } from './tools/read-only/getOrderStatus.tool';
import { getShipmentStatusTool, type ShipmentStatusResult } from './tools/read-only/getShipmentStatus.tool';
import { getRecentQuotesTool, type RecentQuoteSummary } from './tools/read-only/getRecentQuotes.tool';
import { resolveFrankCustomerReference, type ShipmentSummary } from './tools/read-only/shared';
import { updateSessionState } from './session.repository';
import { getDb } from '@/infra/db';
import { carrierPolicies, customers, customerTimelineEvents } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { twilioProvider } from '@/providers/twilio.provider';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import { formatProductQueryResponse, formatFreightSimulationResponse } from '@/lib/formatters/whatsapp-response';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrchestratorResult {
    reply: string;
    intent: Intent;
    intentConfidence: number;
    cep: string | null;
    productRef: string | null;
    simulationId: string | null;
    carrierSuggested: string | null;
    context: ConversationContext | null;
    conversationMode?: ConversationMode;
}

// ─── Response templates ─────────────────────────────────────────────────────

const SAUDACAO_REPLY_NEW = `Olá! 👋 Sou o Frank, assistente da CondStore.

Posso te ajudar com:
🚚 Cotação de frete — envie o CEP e o link do produto
📦 Rastreamento de pedido
💬 Dúvidas sobre produtos

Como posso te ajudar?`;

const SAUDACAO_REPLY_RETURNING = `Olá de novo! 👋 Que bom te ver por aqui.

Como posso te ajudar hoje?
🚚 Frete — envie o CEP + link do produto
📦 Pedidos — pergunte sobre seu pedido`;

const SAUDACAO_ASSISTANT_REPLY_NEW = `Olá! Sou o Frank em modo assistente.

Neste momento eu só faço consultas seguras:
📦 status do pedido
🚚 rastreio e envio
🧾 últimas cotações
👤 contexto do cliente

Me diga o que você precisa consultar.`;

const SAUDACAO_ASSISTANT_REPLY_RETURNING = `Olá de novo! Estou em modo assistente e sigo apenas com leitura.

Posso consultar:
📦 seu pedido mais recente
🚚 rastreio e status de envio
🧾 sua última cotação`;

const FRETE_MISSING_CEP = `🚚 Entendi que você quer calcular o frete!

Para isso, preciso do seu CEP (ex: 01310-100).
Se tiver o link do produto, envie junto!`;

const FRETE_MISSING_PRODUCT = `🚚 Encontrei seu CEP! ✅

Agora preciso saber qual produto. Envie o link do produto da loja ou o código do produto.`;

const NO_CARRIERS = `😕 Não encontrei transportadoras disponíveis para esse destino no momento. Tente novamente em instantes ou entre em contato conosco.`;

const GENERIC_REPLY = `Não entendi muito bem. 🤔

Posso te ajudar com:
🚚 Frete — envie o CEP + link do produto
📦 Pedidos — pergunte sobre seu pedido
💬 Produtos — me envie o link

O que precisa?`;

const ASSISTANT_HUMAN_GUIDANCE = 'fale com um atendente humano ou envie o número exato do pedido ou do envio.';
const ASSISTANT_QUOTE_GUIDANCE = 'fale com um atendente humano ou envie o identificador exato da cotação.';
const ASSISTANT_REPHRASE_GUIDANCE = 'reformule o pedido com o número do pedido/envio ou fale com um atendente humano.';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
});
const LOW_CONFIDENCE_THRESHOLD = 0.25;

type AssistantOutcome = 'success' | 'fallback';
type AssistantFallbackReason =
    | 'low_confidence'
    | 'unsupported_intent'
    | 'customer_context_missing'
    | 'customer_context_not_found'
    | 'order_not_found'
    | 'recent_orders_missing'
    | 'recent_quotes_missing'
    | 'shipment_not_found'
    | 'shipment_incomplete';

function formatQuoteReply(cep: string, quotes: { carrier: string; price: number; deadline: number }[]): string {
    const best = quotes[0];
    const lines = [`🚚 Frete para CEP ${cep}\n`];

    for (const q of quotes.slice(0, 3)) {
        const badge = q === best ? ' ⭐ Melhor opção' : '';
        lines.push(`Transportadora: ${q.carrier.toUpperCase()}${badge}`);
        lines.push(`Prazo: ${q.deadline > 0 ? `${q.deadline} dias úteis` : 'Consultar'}`);
        lines.push(`Valor: R$ ${q.price.toFixed(2)}\n`);
    }

    lines.push(`Para finalizar, acesse nosso site e selecione a transportadora desejada.`);
    return lines.join('\n');
}

function formatDateTime(value: Date | null | undefined): string {
    if (!value) {
        return 'data indisponível';
    }

    return DATE_TIME_FORMATTER.format(value);
}

function humanizeStatus(status: string | null | undefined): string {
    if (!status) {
        return 'indisponível';
    }

    return status.replace(/[_-]/g, ' ');
}

function buildFollowUpMenu(options: {
    showTracking?: boolean;
    showOrder?: boolean;
    showQuote?: boolean;
    customPrompt?: string;
}): string | null {
    const optionsList: string[] = [];
    if (options.showTracking) optionsList.push('• mostrar o rastreio');
    if (options.showOrder) optionsList.push('• consultar seu último pedido');
    if (options.showQuote) optionsList.push('• verificar uma nova cotação');

    if (optionsList.length === 0) return null;

    const prompt = options.customPrompt ?? 'Posso também:';
    return `${prompt}\n${optionsList.join('\n')}`;
}

function formatSupportResponse(params: {
    answer: string;
    facts?: Array<string | null | undefined>;
    nextStep?: string | null;
}): string {
    const facts = (params.facts ?? []).filter((fact): fact is string => {
        return typeof fact === 'string' && fact.trim().length > 0;
    });

    const lines = [params.answer.trim()];
    
    if (facts.length > 0) {
        lines.push('');
        lines.push(...facts);
    }

    if (params.nextStep?.trim()) {
        lines.push('');
        lines.push(params.nextStep.trim());
    }

    return lines.join('\n');
}

function isLowConfidenceAssistantIntent(intentResult: IntentResult): boolean {
    return intentResult.intent === 'OUTRO' || intentResult.confidence < LOW_CONFIDENCE_THRESHOLD;
}

function extractUuidLikeId(message: string): string | null {
    const match = message.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    return match?.[0] ?? null;
}

function formatShipmentSnippet(shipment: ShipmentSummary | null): string {
    if (!shipment) {
        return 'Envio: não vinculado.';
    }

    return shipment.trackingCode
        ? `Envio: ${shipment.shipmentId} • ${shipment.carrier} ${shipment.service} • ${humanizeStatus(shipment.status)} • rastreio ${shipment.trackingCode}.`
        : `Envio: ${shipment.shipmentId} • ${shipment.carrier} ${shipment.service} • ${humanizeStatus(shipment.status)} • sem rastreio.`;
}

function buildAssistantResult(params: {
    reply: string;
    intentResult: IntentResult;
    context: ConversationContext | null;
    cep: string | null;
    productRef: string | null;
    simulationId?: string | null;
    carrierSuggested?: string | null;
}): OrchestratorResult {
    return {
        reply: params.reply,
        intent: params.intentResult.intent,
        intentConfidence: params.intentResult.confidence,
        cep: params.cep,
        productRef: params.productRef,
        simulationId: params.simulationId ?? null,
        carrierSuggested: params.carrierSuggested ?? null,
        context: params.context,
    };
}

async function finalizeAssistantResponse(params: {
    tenantId: string;
    reply: string;
    intentResult: IntentResult;
    context: ConversationContext | null;
    cep: string | null;
    productRef: string | null;
    startedAt: number;
    outcome: AssistantOutcome;
    toolUsed?: string;
    fallbackReason?: AssistantFallbackReason;
    customerId?: string | null;
    orderId?: string | null;
    shipmentId?: string | null;
    simulationId?: string | null;
    carrierSuggested?: string | null;
}): Promise<OrchestratorResult> {
    const latencyMs = Date.now() - params.startedAt;
    const toolUsed = params.toolUsed ?? 'none';
    const sessionId = params.context?.customer.phoneHash ?? null;
    const entityId =
        params.orderId ??
        params.shipmentId ??
        params.simulationId ??
        null;

    const responsePayload = {
        intent: params.intentResult.intent,
        confidence: params.intentResult.confidence,
        toolUsed,
        outcome: params.outcome,
        latencyMs,
        fallbackReason: params.outcome === 'fallback'
            ? params.fallbackReason ?? 'unsupported_intent'
            : undefined,
    };

    logger.info('frank_assist_response', {
        tenantId: params.tenantId,
        ...responsePayload,
        missingContextReason: params.outcome === 'fallback' ? params.fallbackReason : undefined,
        customerId: params.customerId ?? undefined,
        orderId: params.orderId ?? undefined,
        shipmentId: params.shipmentId ?? undefined,
        simulationId: params.simulationId ?? undefined,
    });

    await publishOperationalEvent({
        tenantId: params.tenantId,
        eventType: 'frank_assist_response',
        eventDomain: 'OPERATIONS',
        entityId,
        customerId: params.customerId ?? null,
        sessionId,
        payload: responsePayload,
    });

    if (params.outcome === 'fallback') {
        const handoffReason = params.fallbackReason ?? 'unsupported_intent';

        logger.warn('frank_assist_handoff', {
            tenantId: params.tenantId,
            intent: params.intentResult.intent,
            reason: handoffReason,
            toolUsed,
            customerId: params.customerId ?? undefined,
            orderId: params.orderId ?? undefined,
            shipmentId: params.shipmentId ?? undefined,
            simulationId: params.simulationId ?? undefined,
        });

        await publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: 'frank_assist_handoff',
            eventDomain: 'OPERATIONS',
            entityId,
            customerId: params.customerId ?? null,
            sessionId,
            payload: {
                intent: params.intentResult.intent,
                toolUsed,
                reason: handoffReason,
            },
        });
    }

    const shipmentReferencedId = params.shipmentId ?? null;
    const quoteReferencedId = params.simulationId ?? null;
    const customerReferencedId = params.customerId ?? null;
    const orderReferencedId = params.orderId ?? null;

    // Persist session anchors for conversational continuity
    if (sessionId && (params.outcome === 'success' || orderReferencedId || shipmentReferencedId || quoteReferencedId)) {
        updateSessionState(params.tenantId, sessionId, {
            currentIntent: params.intentResult.intent,
            lastOrderId: orderReferencedId ?? undefined,
            lastReferencedShipmentId: shipmentReferencedId ?? undefined,
            lastReferencedQuoteId: quoteReferencedId ?? undefined,
            lastReferencedCustomerId: customerReferencedId ?? undefined,
            lastToolUsed: params.toolUsed ?? undefined,
        }).catch(() => {});
    }

    return buildAssistantResult({
        reply: params.reply,
        intentResult: params.intentResult,
        context: params.context,
        cep: params.cep,
        productRef: params.productRef,
        simulationId: params.simulationId ?? null,
        carrierSuggested: params.carrierSuggested ?? null,
    });
}

async function resolveConversationCustomerId(
    tenantId: string,
    context: ConversationContext | null,
    phone?: string,
): Promise<string | null> {
    const customerReference = await resolveFrankCustomerReference({
        tenantId,
        sessionCustomerId: context?.sessionState?.customerId ?? null,
        phone: phone ?? null,
    });

    return customerReference?.customerId ?? null;
}

function formatOrderStatusReply(
    orderStatus: OrderStatusResult,
    options?: { assumedMostRecent?: boolean; nextStep?: string | null },
): string {
    const latestHistory = orderStatus.statusHistory[0];

    const menu = buildFollowUpMenu({
        showTracking: !!orderStatus.linkedShipment,
        showQuote: true,
    });

    return formatSupportResponse({
        answer: `Seu pedido ${orderStatus.order.id} está com status: ${humanizeStatus(orderStatus.currentStatus)}.`,
        facts: [
            options?.assumedMostRecent ? '(Baseado no pedido mais recente encontrado para este cliente)' : null,
            `Criado em: ${formatDateTime(orderStatus.order.createdAt)}`,
            latestHistory
                ? `Última atualização: ${humanizeStatus(latestHistory.status)} em ${formatDateTime(latestHistory.createdAt)}`
                : null,
            formatShipmentSnippet(orderStatus.linkedShipment),
        ],
        nextStep: [options?.nextStep, menu].filter(Boolean).join('\n\n'),
    });
}

function formatShipmentStatusReply(
    shipmentStatus: ShipmentStatusResult,
    options?: { assumedMostRecent?: boolean; nextStep?: string | null },
): string {
    const menu = buildFollowUpMenu({
        showOrder: true,
        showQuote: true,
    });

    return formatSupportResponse({
        answer: `Seu envio ${shipmentStatus.shipment.id} está com status: ${humanizeStatus(shipmentStatus.deliveryStatus)}.`,
        facts: [
            options?.assumedMostRecent ? '(Baseado no envio mais recente vinculado ao seu último pedido)' : null,
            `Transportadora: ${shipmentStatus.carrier.name}`,
            `Serviço: ${shipmentStatus.carrier.service}`,
            shipmentStatus.trackingToken
                ? `Rastreio: ${shipmentStatus.trackingToken}`
                : 'Código de rastreio indisponível no momento.',
            shipmentStatus.lastLocationEvent
                ? `Última atualização: ${formatDateTime(shipmentStatus.lastLocationEvent.recordedAt)}`
                : null,
        ],
        nextStep: [options?.nextStep, menu].filter(Boolean).join('\n\n'),
    });
}

function formatRecentOrdersReply(recentOrders: RecentOrderSummary[]): string {
    const menu = buildFollowUpMenu({
        showTracking: true,
        showQuote: true,
    });

    return formatSupportResponse({
        answer: `Encontrei ${recentOrders.length} pedido(s) recente(s).`,
        facts: recentOrders.slice(0, 3).map((order) => {
            const tracking = order.linkedShipment?.trackingCode
                ? ` • rastreio ${order.linkedShipment.trackingCode}`
                : '';
            return `${order.orderId} • ${humanizeStatus(order.currentStatus)} • ${formatDateTime(order.createdAt)}${tracking}`;
        }),
        nextStep: menu,
    });
}

function formatRecentQuotesReply(recentQuotes: RecentQuoteSummary[]): string {
    const menu = buildFollowUpMenu({
        showOrder: true,
    });

    return formatSupportResponse({
        answer: `Encontrei ${recentQuotes.length} cotação(ões) recente(s).`,
        facts: recentQuotes.slice(0, 3).map((quote) => {
            return `${quote.simulationId} • ${quote.routeSummary} • ${quote.carrierSummary ?? 'sem transportadora'} • ${formatDateTime(quote.quotedAt)} • ${humanizeStatus(quote.currentQuoteState)}`;
        }),
        nextStep: menu,
    });
}

async function handleAssistantIntent(params: {
    tenantId: string;
    message: string;
    phone?: string;
    intentResult: IntentResult;
    context: ConversationContext | null;
    cep: string | null;
    productRef: string | null;
    extractedEntities?: ExtractedEntities;
}): Promise<OrchestratorResult> {
    const { tenantId, message, phone, intentResult, context, cep, productRef, extractedEntities } = params;
    const startedAt = Date.now();
    const explicitId = extractUuidLikeId(message) ?? extractedEntities?.orderId ?? null;

    if (isLowConfidenceAssistantIntent(intentResult)) {
        return finalizeAssistantResponse({
            tenantId,
            reply: formatSupportResponse({
                answer: 'Não consegui classificar essa solicitação com segurança.',
                nextStep: ASSISTANT_REPHRASE_GUIDANCE,
            }),
            intentResult,
            context,
            cep,
            productRef,
            startedAt,
            outcome: 'fallback',
            toolUsed: 'none',
            fallbackReason: 'low_confidence',
        });
    }

    switch (intentResult.intent) {
        case 'FRETE':
        case 'CONFIRM_QUOTE':
        case 'PRODUTO':
            return finalizeAssistantResponse({
                tenantId,
                reply: formatSupportResponse({
                    answer: 'Estou em modo assistente com leitura estrita.',
                    facts: ['Neste momento eu só consulto dados de pedido, envio, cotação e contexto do cliente.'],
                    nextStep: ASSISTANT_HUMAN_GUIDANCE,
                }),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'fallback',
                toolUsed: 'none',
                fallbackReason: 'unsupported_intent',
            });

        case 'ORDER_STATUS':
        case 'PEDIDO': {
            let orderStatus: OrderStatusResult | null = null;
            let assumedMostRecent = false;
            let toolUsed = 'get_order_status';
            let customerId: string | null = null;

            if (explicitId) {
                orderStatus = await getOrderStatusTool({ tenantId, orderId: explicitId });
            }

            if (!orderStatus && context?.sessionState?.lastOrderId) {
                orderStatus = await getOrderStatusTool({
                    tenantId,
                    orderId: context.sessionState.lastOrderId,
                });
            }

            if (!orderStatus) {
                if (phone) {
                    twilioProvider.sendMessage(tenantId, {
                        to: phone,
                        body: 'Estou verificando seu pedido para te responder com precisão.'
                    }).catch(err => logger.error('frank_assist_wait_msg_failed', err as Error));
                }

                customerId = await resolveConversationCustomerId(tenantId, context, phone);

                if (!customerId) {
                    return finalizeAssistantResponse({
                        tenantId,
                        reply: formatSupportResponse({
                            answer: 'Não consegui localizar o cliente desta conversa com segurança.',
                            nextStep: ASSISTANT_HUMAN_GUIDANCE,
                        }),
                        intentResult,
                        context,
                        cep,
                        productRef,
                        startedAt,
                        outcome: 'fallback',
                        toolUsed,
                        fallbackReason: 'customer_context_missing',
                    });
                }

                const recentOrders = await getRecentOrdersTool({
                    tenantId,
                    customerId,
                    limit: 1,
                });
                toolUsed = 'get_recent_orders>get_order_status';

                if (recentOrders.length === 0) {
                    return finalizeAssistantResponse({
                        tenantId,
                        reply: formatSupportResponse({
                            answer: 'Não encontrei pedido para este cliente.',
                            nextStep: ASSISTANT_HUMAN_GUIDANCE,
                        }),
                        intentResult,
                        context,
                        cep,
                        productRef,
                        startedAt,
                        outcome: 'fallback',
                        toolUsed,
                        fallbackReason: 'order_not_found',
                        customerId,
                    });
                }

                assumedMostRecent = true;
                orderStatus = await getOrderStatusTool({
                    tenantId,
                    orderId: recentOrders[0].orderId,
                });
            }

            if (!orderStatus) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não encontrei esse pedido com segurança.',
                        nextStep: ASSISTANT_HUMAN_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed,
                    fallbackReason: 'order_not_found',
                    customerId,
                    orderId: explicitId ?? context?.sessionState?.lastOrderId ?? null,
                });
            }

            return finalizeAssistantResponse({
                tenantId,
                reply: formatOrderStatusReply(orderStatus, {
                    assumedMostRecent,
                    nextStep: orderStatus.linkedShipment
                        ? null
                        : 'se precisar confirmar expedição, um atendente humano pode revisar o pedido.',
                }),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'success',
                toolUsed,
                customerId: orderStatus.order.customerId,
                orderId: orderStatus.order.id,
                carrierSuggested: orderStatus.linkedShipment?.carrier ?? null,
            });
        }

        case 'SHIPMENT_STATUS': {
            let shipmentStatus: ShipmentStatusResult | null = null;
            let assumedMostRecent = false;
            let toolUsed = 'get_shipment_status';
            let customerId: string | null = null;
            let partialOrderStatus: OrderStatusResult | null = null;

            if (explicitId) {
                shipmentStatus = await getShipmentStatusTool({
                    tenantId,
                    shipmentId: explicitId,
                });
            }

            if (!shipmentStatus) {
                let candidateOrderId = context?.sessionState?.lastOrderId ?? null;

                if (!candidateOrderId) {
                    if (phone) {
                        twilioProvider.sendMessage(tenantId, {
                            to: phone,
                            body: 'Estou verificando seu pedido e envio para te responder com precisão.'
                        }).catch(err => logger.error('frank_assist_wait_msg_failed', err as Error));
                    }

                    customerId = await resolveConversationCustomerId(tenantId, context, phone);

                    if (!customerId) {
                        return finalizeAssistantResponse({
                            tenantId,
                            reply: formatSupportResponse({
                                answer: 'Não consegui localizar o cliente desta conversa com segurança.',
                                nextStep: ASSISTANT_HUMAN_GUIDANCE,
                            }),
                            intentResult,
                            context,
                            cep,
                            productRef,
                            startedAt,
                            outcome: 'fallback',
                            toolUsed,
                            fallbackReason: 'customer_context_missing',
                        });
                    }

                    const recentOrders = await getRecentOrdersTool({
                        tenantId,
                        customerId,
                        limit: 1,
                    });

                    if (recentOrders.length === 0) {
                        return finalizeAssistantResponse({
                            tenantId,
                            reply: formatSupportResponse({
                                answer: 'Não encontrei envio para este cliente.',
                                nextStep: ASSISTANT_HUMAN_GUIDANCE,
                            }),
                            intentResult,
                            context,
                            cep,
                            productRef,
                            startedAt,
                            outcome: 'fallback',
                            toolUsed: 'get_recent_orders',
                            fallbackReason: 'shipment_not_found',
                            customerId,
                        });
                    }

                    candidateOrderId = recentOrders[0].orderId;
                    assumedMostRecent = true;
                }

                partialOrderStatus = candidateOrderId
                    ? await getOrderStatusTool({ tenantId, orderId: candidateOrderId })
                    : null;

                toolUsed = 'get_order_status>get_shipment_status';

                if (!partialOrderStatus?.linkedShipment) {
                    return finalizeAssistantResponse({
                        tenantId,
                        reply: formatSupportResponse({
                            answer: partialOrderStatus
                                ? `Encontrei o pedido ${partialOrderStatus.order.id}, mas o envio ainda não está disponível para consulta.`
                                : 'Não encontrei dados de envio suficientes para essa consulta.',
                            facts: partialOrderStatus
                                ? [`Status do pedido: ${humanizeStatus(partialOrderStatus.currentStatus)}.`]
                                : [],
                            nextStep: 'um atendente humano pode confirmar manualmente a expedição ou o rastreio.',
                        }),
                        intentResult,
                        context,
                        cep,
                        productRef,
                        startedAt,
                        outcome: 'fallback',
                        toolUsed,
                        fallbackReason: 'shipment_incomplete',
                        customerId: customerId ?? partialOrderStatus?.order.customerId ?? null,
                        orderId: partialOrderStatus?.order.id ?? candidateOrderId,
                    });
                }

                shipmentStatus = await getShipmentStatusTool({
                    tenantId,
                    shipmentId: partialOrderStatus.linkedShipment.shipmentId,
                });
            }

            if (!shipmentStatus) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não encontrei esse envio com segurança.',
                        nextStep: ASSISTANT_HUMAN_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed,
                    fallbackReason: 'shipment_not_found',
                    customerId,
                    orderId: partialOrderStatus?.order.id ?? context?.sessionState?.lastOrderId ?? null,
                    shipmentId: explicitId,
                });
            }

            const shipmentReply = formatShipmentStatusReply(shipmentStatus, {
                assumedMostRecent,
                nextStep: shipmentStatus.trackingToken
                    ? null
                    : 'um atendente humano pode acompanhar manualmente até o rastreio ser disponibilizado.',
            });

            return finalizeAssistantResponse({
                tenantId,
                reply: shipmentReply,
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: shipmentStatus.trackingToken ? 'success' : 'fallback',
                toolUsed,
                fallbackReason: shipmentStatus.trackingToken ? undefined : 'shipment_incomplete',
                customerId: customerId ?? partialOrderStatus?.order.customerId ?? null,
                orderId: partialOrderStatus?.order.id ?? null,
                shipmentId: shipmentStatus.shipment.id,
                carrierSuggested: shipmentStatus.carrier.name,
            });
        }

        case 'RECENT_ORDERS': {
            const customerId = await resolveConversationCustomerId(tenantId, context, phone);

            if (!customerId) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não consegui localizar o cliente desta conversa com segurança.',
                        nextStep: ASSISTANT_HUMAN_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed: 'get_recent_orders',
                    fallbackReason: 'customer_context_missing',
                });
            }

            const recentOrders = await getRecentOrdersTool({
                tenantId,
                customerId,
            });

            if (recentOrders.length === 0) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não encontrei pedidos recentes para este cliente.',
                        nextStep: ASSISTANT_HUMAN_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed: 'get_recent_orders',
                    fallbackReason: 'recent_orders_missing',
                    customerId,
                });
            }

            return finalizeAssistantResponse({
                tenantId,
                reply: formatRecentOrdersReply(recentOrders),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'success',
                toolUsed: 'get_recent_orders',
                customerId,
                orderId: recentOrders[0].orderId,
                carrierSuggested: recentOrders[0].linkedShipment?.carrier ?? null,
            });
        }

        case 'RECENT_QUOTES': {
            const customerId = await resolveConversationCustomerId(tenantId, context, phone);

            if (!customerId) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não consegui localizar o cliente desta conversa com segurança.',
                        nextStep: ASSISTANT_QUOTE_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed: 'get_recent_quotes',
                    fallbackReason: 'customer_context_missing',
                });
            }

            const recentQuotes = await getRecentQuotesTool({
                tenantId,
                customerId,
            });

            if (recentQuotes.length === 0) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não encontrei cotações recentes para este cliente.',
                        nextStep: ASSISTANT_QUOTE_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed: 'get_recent_quotes',
                    fallbackReason: 'recent_quotes_missing',
                    customerId,
                });
            }

            return finalizeAssistantResponse({
                tenantId,
                reply: formatRecentQuotesReply(recentQuotes),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'success',
                toolUsed: 'get_recent_quotes',
                customerId,
                simulationId: recentQuotes[0].simulationId,
                carrierSuggested: recentQuotes[0].carrierSummary,
            });
        }

        case 'CUSTOMER_CONTEXT': {
            const customerContext = await getCustomerContextTool({
                tenantId,
                sessionCustomerId: context?.sessionState?.customerId ?? null,
                phone: phone ?? null,
            });

            if (!customerContext) {
                return finalizeAssistantResponse({
                    tenantId,
                    reply: formatSupportResponse({
                        answer: 'Não encontrei contexto suficiente para esse cliente.',
                        nextStep: ASSISTANT_HUMAN_GUIDANCE,
                    }),
                    intentResult,
                    context,
                    cep,
                    productRef,
                    startedAt,
                    outcome: 'fallback',
                    toolUsed: 'get_customer_context',
                    fallbackReason: 'customer_context_not_found',
                });
            }

            const organizationName =
                customerContext.organization.tradeName ??
                customerContext.organization.legalName;

            const menu = buildFollowUpMenu({
                showOrder: !!customerContext.recentOrders[0],
                showQuote: !!customerContext.recentQuotes[0],
                customPrompt: 'O que deseja consultar?'
            });

            return finalizeAssistantResponse({
                tenantId,
                reply: formatSupportResponse({
                    answer: `Encontrei o cadastro vinculado à organização ${organizationName}.`,
                    facts: [
                        `${customerContext.contacts.length} contato(s) registrado(s).`,
                        customerContext.recentOrders[0]
                            ? `Último pedido: ${customerContext.recentOrders[0].orderId} em ${formatDateTime(customerContext.recentOrders[0].createdAt)}.`
                            : 'Sem pedido recente vinculado.',
                        customerContext.recentQuotes[0]
                            ? `Última cotação: ${customerContext.recentQuotes[0].simulationId} em ${formatDateTime(customerContext.recentQuotes[0].quotedAt)}.`
                            : 'Sem cotação recente vinculada.',
                    ],
                    nextStep: menu,
                }),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'success',
                toolUsed: 'get_customer_context',
                customerId: customerContext.customer.id,
                orderId: customerContext.recentOrders[0]?.orderId ?? null,
                simulationId: customerContext.recentQuotes[0]?.simulationId ?? null,
                carrierSuggested: customerContext.recentQuotes[0]?.carrierSummary ?? null,
            });
        }

        case 'OUTRO':
        default:
            return finalizeAssistantResponse({
                tenantId,
                reply: formatSupportResponse({
                    answer: 'Não consegui resolver essa consulta com segurança.',
                    nextStep: ASSISTANT_REPHRASE_GUIDANCE,
                }),
                intentResult,
                context,
                cep,
                productRef,
                startedAt,
                outcome: 'fallback',
                toolUsed: 'none',
                fallbackReason: 'low_confidence',
            });
    }
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

export async function handleIncomingMessage(
    tenantId: string,
    message: string,
    phone?: string,
): Promise<OrchestratorResult> {
    const assistantMode = isFrankAssistantMode();
    const cep = extractCep(message);
    const cepRaw = extractCepRaw(message);
    const productRef = resolveProductFromUrl(message);

    // Resolve conversation context (non-blocking on failure)
    let context: ConversationContext | null = null;
    if (phone) {
        try {
            context = await resolveConversationContext(tenantId, phone);
        } catch (err) {
            logger.warn('frank_orchestrator_context_error', { tenantId, error: (err as Error).message });
        }
    }

    // Build session anchors for contextual resolution
    const sessionAnchors: SessionAnchors | null = context?.sessionState
        ? {
            lastReferencedOrderId: context.sessionState.lastOrderId ?? null,
            lastReferencedShipmentId: context.sessionState.lastReferencedShipmentId ?? null,
            lastReferencedQuoteId: context.sessionState.lastReferencedQuoteId ?? null,
            lastReferencedCustomerId: context.sessionState.lastReferencedCustomerId ?? null,
            previousIntent: (context.sessionState.currentIntent as Intent) ?? null,
            lastToolUsed: context.sessionState.lastToolUsed ?? null,
        }
        : null;

    const intentResult: IntentResult = assistantMode
        ? resolveContextualIntent(message, sessionAnchors)
        : resolveIntent(message);

    // ─── Entity Resolution ──────────────────────────────────────────────
    const entityResult: EntityResolutionResult = resolveEntities(message);
    const entityTypes = detectedEntityTypes(entityResult.entities);

    if (context?.customer?.phoneHash) {
        intentTrainingService.captureIntent(tenantId, context.customer.phoneHash, {
            messageText: message,
            detectedIntent: intentResult.intent,
            confidence: intentResult.confidence,
            entities: Object.keys(entityResult.entities).length > 0 ? entityResult.entities : undefined,
        }).catch(err => logger.error('failed_to_capture_intent', err as Error));
    }

    if (entityTypes.length > 0) {
        logger.info('frank_entity_detected', {
            tenantId,
            intent: intentResult.intent,
            entityTypes,
            confidence: entityResult.confidence,
        });
        publishOperationalEvent({
            tenantId,
            eventType: 'frank_entity_detected',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { intent: intentResult.intent, entityTypes, confidence: entityResult.confidence },
        }).catch(() => {});
    } else {
        const missing = missingEntityTypes(entityResult.entities, ['product', 'orderId']);
        if (missing.length > 0) {
            logger.info('frank_entity_missing', {
                tenantId,
                intent: intentResult.intent,
                missingEntities: missing,
            });
            publishOperationalEvent({
                tenantId,
                eventType: 'frank_entity_missing',
                eventDomain: 'OPERATIONS',
                entityId: null,
                customerId: null,
                sessionId: context?.customer.phoneHash ?? null,
                payload: { intent: intentResult.intent, missingEntities: missing },
            }).catch(() => {});
        }
    }

    const prevContext = (context?.sessionState?.contextJson as Record<string, unknown>) ?? {};
    const autoResponsesCount = typeof prevContext.autoResponsesCount === 'number' ? prevContext.autoResponsesCount : 0;

    let entitiesComplete = true;
    const hasProduct = !!entityResult.entities.product || !!prevContext.activeProduct || !!productRef;
    const hasOrder = !!entityResult.entities.orderId || !!context?.sessionState?.lastOrderId;
    
    if (['FRETE', 'PRODUTO'].includes(intentResult.intent)) {
        entitiesComplete = hasProduct;
    } else if (['ORDER_STATUS', 'SHIPMENT_STATUS', 'PEDIDO'].includes(intentResult.intent)) {
        entitiesComplete = hasOrder;
    }

    // ─── Conversation Control Gate ───────────────────────────────────────
    const gateResult: ConversationGateResult = resolveConversationMode({
        intent: intentResult.intent,
        entities: entityResult.entities,
        confidence: intentResult.confidence,
        timestamp: new Date(),
        operatorOnline: false, // TODO: connect with real presense module
        entitiesComplete,
        autoResponsesCount,
        messageBody: message,
    });

    const newAutoResponsesCount = gateResult.mode === 'SUPERVISED' ? 0 : autoResponsesCount + 1;

    // Force SUPERVISED mode if the system globally enforces supervised only.
    if (isFrankSupervisedOnly()) {
        gateResult.mode = 'SUPERVISED';
        gateResult.reason = 'supervised_only_mode_enforced';
    }

    // Persist entities and mode limits in session contextJson
    if (context?.customer.phoneHash) {
        updateSessionState(tenantId, context.customer.phoneHash, {
            contextJson: {
                ...prevContext,
                autoResponsesCount: newAutoResponsesCount,
                ...(entityTypes.length > 0 ? { lastEntities: entityResult.entities } : {}),
                ...(entityResult.entities.product ? { activeProduct: entityResult.entities.product } : {}),
                ...(entityResult.entities.orderId ? { activeOrderId: entityResult.entities.orderId } : {}),
            },
        }).catch(() => {});
    }

    logger.info(`frank_mode_${gateResult.mode.toLowerCase()}`, {
        tenantId,
        intent: intentResult.intent,
        mode: gateResult.mode,
        reason: gateResult.reason,
    });
    publishOperationalEvent({
        tenantId,
        eventType: `frank_mode_${gateResult.mode.toLowerCase()}`,
        eventDomain: 'OPERATIONS',
        entityId: null,
        customerId: null,
        sessionId: context?.customer.phoneHash ?? null,
        payload: { intent: intentResult.intent, mode: gateResult.mode, reason: gateResult.reason },
    }).catch(() => {});

    logger.info('frank_orchestrator_intent', {
        tenantId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        mode: assistantMode ? 'assistant' : 'default',
        conversationMode: gateResult.mode,
        hasCep: !!cep,
        hasProduct: !!productRef,
        isReturning: context?.customer.isReturning ?? false,
        entityTypes,
    });

    // ─── Frank Runtime Gate ───────────────────────────────────────────────
    const frankEnabled = isFrankRuntimeEnabled();

    // ─── Conversation Memory: Load Context ────────────────────────────────
    const sessionId = context?.customer.phoneHash ?? null;
    if (frankEnabled && sessionId) {
        const memoryContext = await loadConversationContext(tenantId, sessionId);
        if (memoryContext.messages.length > 0) {
            publishOperationalEvent({
                tenantId,
                eventType: 'frank_memory_context_loaded',
                eventDomain: 'OPERATIONS',
                entityId: null,
                customerId: null,
                sessionId,
                payload: { messageCount: memoryContext.messages.length },
            }).catch(() => {});
        }
    }

    // ─── Conversation Memory: Persist Inbound ─────────────────────────────
    if (frankEnabled && sessionId) {
        recordInboundMessage(
            tenantId,
            sessionId,
            message,
            intentResult.intent,
            entityResult.entities as unknown as Record<string, unknown>,
        ).catch(() => {});
    }

    // ─── Frank Playbooks Integration ─────────────────────────────────────
    const playbook: ResolvedPlaybook | null = frankEnabled
        ? await resolvePlaybook({
            tenantId,
            intent: intentResult.intent,
            entities: entityResult.entities,
        })
        : null;

    if (playbook) {
        publishOperationalEvent({
            tenantId,
            eventType: 'frank_playbook_used',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { intent: intentResult.intent, playbookId: playbook.playbookId, originalMode: gateResult.mode },
        }).catch(() => {});

        if (playbook.requiresHumanHandoff && gateResult.mode !== 'SUPERVISED') {
            gateResult.mode = 'SUPERVISED';
            gateResult.reason = 'playbook_requires_handoff';
            publishOperationalEvent({
                tenantId,
                eventType: 'frank_playbook_handoff',
                eventDomain: 'OPERATIONS',
                entityId: null,
                customerId: null,
                sessionId: context?.customer.phoneHash ?? null,
                payload: { intent: intentResult.intent, playbookId: playbook.playbookId },
            }).catch(() => {});
        }
    } else {
        publishOperationalEvent({
            tenantId,
            eventType: 'frank_playbook_missing',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { intent: intentResult.intent },
        }).catch(() => {});
    }

    // ─── Frank Knowledge Base Search ──────────────────────────────────────
    const knowledgeEntry = frankEnabled && !playbook
        ? await resolveKnowledge(tenantId, message, sessionId)
        : null;

    // ─── SAUDACAO ───────────────────────────────────────────────────────
    if (intentResult.intent === 'SAUDACAO') {
        const reply = assistantMode
            ? (context?.customer.isReturning ? SAUDACAO_ASSISTANT_REPLY_RETURNING : SAUDACAO_ASSISTANT_REPLY_NEW)
            : (context?.customer.isReturning ? SAUDACAO_REPLY_RETURNING : SAUDACAO_REPLY_NEW);
        
        const finalReply = playbook 
            ? `${playbook.responseBase}\n\n${playbook.nextStepSuggestion ?? ''}`.trim()
            : reply;

        return {
            reply: gateResult.mode === 'SUPERVISED' ? `[SUGESTÃO FRANK] ${finalReply}` : finalReply,
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            cep, productRef, simulationId: null,
            carrierSuggested: null, context,
            conversationMode: gateResult.mode,
        };
    }

    // ─── PRODUCT_QUERY ──────────────────────────────────────────────
    if (intentResult.intent === 'PRODUTO' || intentResult.intent === 'PRODUCT_QUERY') {
        const queryTerm = (entityResult.entities.product as string) || productRef || message.replace(/(qual o pre[çc]o|quero saber o pre[çc]o|produto|quero|comprar)/gi, '').trim();
        
        publishOperationalEvent({
            tenantId,
            eventType: 'product_query_requested',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { query: queryTerm },
        }).catch(() => {});

        const products = await catalogService.searchProductsByName(tenantId, queryTerm);
        
        publishOperationalEvent({
            tenantId,
            eventType: 'product_query_result',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { query: queryTerm, resultsCount: products.length },
        }).catch(() => {});

        return {
            reply: formatProductQueryResponse(products),
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            cep, productRef, simulationId: null,
            carrierSuggested: null, context,
            conversationMode: gateResult.mode,
        };
    }

    // ─── FREIGHT (simulate flow) ────────────────────────────────────────
    if (intentResult.intent === 'FRETE' || intentResult.intent === 'FREIGHT') {
        if (!cepRaw) {
            return {
                reply: FRETE_MISSING_CEP,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
                conversationMode: gateResult.mode,
            };
        }

        const productIdentifier = productRef || (entityResult.entities.product as string) || (context?.sessionState?.contextJson as any)?.activeProduct;

        if (!productIdentifier) {
            return {
                reply: FRETE_MISSING_PRODUCT,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
                conversationMode: gateResult.mode,
            };
        }

        const quantity = entityResult.entities.quantity || 1;

        publishOperationalEvent({
            tenantId,
            eventType: 'freight_simulation_requested',
            eventDomain: 'OPERATIONS',
            entityId: null,
            customerId: null,
            sessionId: context?.customer.phoneHash ?? null,
            payload: { cep: cepRaw, productId: productIdentifier, quantity },
        }).catch(() => {});

        try {
            const result = await freightService.simulateFreight({
                tenantId,
                productQuery: productIdentifier,
                quantity,
                destinationZip: cepRaw,
            });

            publishOperationalEvent({
                tenantId,
                eventType: 'freight_simulation_result',
                eventDomain: 'OPERATIONS',
                entityId: null,
                customerId: null,
                sessionId: context?.customer.phoneHash ?? null,
                payload: { carrier: result.carrier, price: result.price, deliveryDays: result.deliveryDays },
            }).catch(() => {});

            return {
                reply: formatFreightSimulationResponse(cepRaw, result.carrier, result.deliveryDays, result.price),
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep,
                productRef: productIdentifier,
                simulationId: null,
                carrierSuggested: result.carrier,
                context,
                conversationMode: gateResult.mode,
            };
        } catch (err: any) {
            logger.error('frank_orchestrator_quote_error', err as Error, { tenantId, cepRaw, productIdentifier });
            return {
                reply: 'Desculpe, tive um problema ao calcular o frete. Por favor, tente novamente.',
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
                conversationMode: gateResult.mode,
            };
        }
    }

    // ─── CONFIRM QUOTE (Order Conversion) ────────────────────────────────
    if (intentResult.intent === 'CONFIRM_QUOTE') {
        const lastQuote = context?.lastQuotes?.[0]; // Get the most recent quote
        
        if (!lastQuote || !lastQuote.carrierSelected) {
            return {
                reply: `Preciso que você calcule um frete primeiro antes de eu conseguir confirmar o pedido. Envie o CEP e o link do produto!`,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
            };
        }

        if (isFrankSupervisedOnly()) {
            return {
                reply: `Entendido. Posso gerar o pedido ${lastQuote.simulationId} para este cliente. Por favor, aprove e finalize usando o painel logístico do atendente.`,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
            };
        }

        try {
            // Retrieve customer reference from the DB matching this tenant & phone if possible
            const db = await getDb();
            let resolvedCustomerId = '00000000-0000-0000-0000-000000000000'; // Fallback
            let resolvedOrgId = '00000000-0000-0000-0000-000000000000'; // Fallback

            // In a complete implementation, the customer hash is queried to find the exact 'customers' entity
            // Using a stub query to represent this retrieval
            const customerRecs = await db.select().from(customers).where(eq(customers.tenantId, tenantId)).limit(1);
            if (customerRecs.length > 0) {
                resolvedCustomerId = customerRecs[0].id;
                resolvedOrgId = customerRecs[0].organizationId;
            }

            const itemName = lastQuote.productRef ? `Produto: ${lastQuote.productRef}` : 'Produto Genérico';
            const itemPrice = lastQuote.quotedFreight ? parseFloat(lastQuote.quotedFreight) : 0; // Using freight as placeholder price if no product price available

            const orderResult = await createOrderFromQuoteTool({
                tenantId,
                simulationId: lastQuote.simulationId,
                customerId: resolvedCustomerId,
                organizationId: resolvedOrgId,
                items: [{
                    name: itemName,
                    quantity: 1,
                    unitPrice: itemPrice > 0 ? itemPrice : 1, // Ensure non-zero
                }]
            });

            // Emit explicit Frank interaction timeline event
            await db.insert(customerTimelineEvents).values({
                id: crypto.randomUUID(),
                tenantId,
                organizationId: resolvedOrgId,
                entityType: 'QUOTE',
                entityId: lastQuote.simulationId,
                status: 'frank_order_created',
                messagePublic: `Frank converteu a cotação no pedido ${orderResult.orderId} via WhatsApp.`,
                metadataJson: {
                    orderId: orderResult.orderId,
                    simulationId: lastQuote.simulationId,
                    channel: 'whatsapp'
                }
            });

            // Persist session state: mark order creation
            if (context?.sessionState) {
                await updateSessionState(tenantId, context.customer.phoneHash, {
                    currentIntent: 'order_created',
                    currentStep: 'completed',
                    lastOrderId: orderResult.orderId,
                }).catch(() => {});
            }

            return {
                reply: `Pedido criado com sucesso! ✅\n\nNúmero do pedido: ${orderResult.orderId}\nSeu envio será preparado e você receberá atualizações em breve.`,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep: lastQuote.cep,
                productRef: lastQuote.productRef,
                simulationId: lastQuote.simulationId,
                carrierSuggested: lastQuote.carrierSelected,
                context,
            };

        } catch (error) {
            logger.error('frank_orchestrator_confirm_quote_failed', error as Error, { tenantId });
            return {
                reply: `Desculpe, ocorreu um erro ao tentar criar o seu pedido. Por favor, tente novamente ou entre em contato com um atendente.`,
                intent: intentResult.intent,
                intentConfidence: intentResult.confidence,
                cep, productRef, simulationId: null,
                carrierSuggested: null, context,
            };
        }
    }

    if (assistantMode) {
        // Playbook interception for Assistant fallback queries
        if (playbook && !['PRODUTO', 'FRETE', 'ORDER_STATUS', 'SHIPMENT_STATUS'].includes(intentResult.intent)) {
            const finalReply = `${playbook.responseBase}\n\n${playbook.nextStepSuggestion ?? ''}`.trim();
            const assistantResult = await finalizeAssistantResponse({
                tenantId,
                reply: finalReply,
                intentResult,
                context,
                cep,
                productRef,
                startedAt: Date.now(),
                outcome: playbook.requiresHumanHandoff ? 'fallback' : 'success',
                toolUsed: 'playbook',
            });

            if (gateResult.mode === 'SUPERVISED') {
                assistantResult.reply = `[SUGESTÃO FRANK] ${assistantResult.reply}`;
            }
            assistantResult.conversationMode = gateResult.mode;
            return assistantResult;
        }

        const assistantResult = await handleAssistantIntent({
            tenantId,
            message,
            phone,
            intentResult,
            context,
            cep,
            productRef,
            extractedEntities: entityResult.entities,
        });

        // Tag SUPERVISED replies for operator review
        if (gateResult.mode === 'SUPERVISED') {
            assistantResult.reply = `[SUGESTÃO FRANK] ${assistantResult.reply}`;
        }
        assistantResult.conversationMode = gateResult.mode;

        return assistantResult;
    }

    // ─── Knowledge Base Fallback ─────────────────────────────────────────
    if (knowledgeEntry) {
        const knowledgeReply = knowledgeEntry.content;
        const finalKnowledgeReply = gateResult.mode === 'SUPERVISED'
            ? `[SUGESTÃO FRANK] ${knowledgeReply}`
            : knowledgeReply;

        // Persist outbound memory
        if (frankEnabled && sessionId) {
            recordOutboundMessage(tenantId, sessionId, finalKnowledgeReply, intentResult.intent).catch(() => {});
        }

        // Generate suggestion for operator if SUPERVISED
        if (frankEnabled && gateResult.mode === 'SUPERVISED' && sessionId) {
            suggestionService.generateSuggestion(tenantId, sessionId, {
                conversationId: '', // orchestrator doesn't have it 
                intent: intentResult.intent,
                entities: Object.keys(entityResult.entities).length > 0 ? entityResult.entities : undefined,
                suggestedResponse: knowledgeReply,
                confidence: intentResult.confidence,
            }).catch(() => {});
        }

        return {
            reply: finalKnowledgeReply,
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            cep, productRef, simulationId: null,
            carrierSuggested: null, context,
            conversationMode: gateResult.mode,
        };
    }

    // ─── PRODUTO / PEDIDO / OUTRO ───────────────────────────────────────
    const genericResult: OrchestratorResult = {
        reply: GENERIC_REPLY,
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        cep, productRef, simulationId: null,
        carrierSuggested: null, context,
    };

    // Persist outbound memory
    if (frankEnabled && sessionId) {
        recordOutboundMessage(tenantId, sessionId, genericResult.reply, intentResult.intent).catch(() => {});
    }

    // Generate suggestion for operator if SUPERVISED
    if (frankEnabled && gateResult.mode === 'SUPERVISED' && sessionId) {
        suggestionService.generateSuggestion(tenantId, sessionId, {
            conversationId: '',
            intent: intentResult.intent,
            entities: Object.keys(entityResult.entities).length > 0 ? entityResult.entities : undefined,
            suggestedResponse: genericResult.reply,
            confidence: intentResult.confidence,
        }).catch(() => {});
    }

    return genericResult;
}

// ─── Auto-quote engine (reuses existing freight pipeline) ────────────────────

async function executeAutoQuote(
    tenantId: string,
    cepRaw: string,
    productRef: string,
): Promise<{ simulationId: string; quotes: { carrier: string; price: number; deadline: number }[] } | null> {
    const opSettings = await loadOperationalSettings(tenantId);
    const cubageFactor = opSettings.defaultCubageFactor;
    const originCep = opSettings.defaultOriginCep;

    // 1. Resolve packing
    const resolved = await resolvePackingDimensions({
        tenantId,
        productRef,
        quantity: 1,
        defaultUnitWeight: 0.5,
    });

    // 2. Compute volumes & cubage
    const volumes = resolved.volumeDetails && resolved.volumeDetails.length > 0
        ? resolved.volumeDetails.map(v => ({ length: v.length, width: v.width, height: v.height, qty: 1 }))
        : [{ length: resolved.length || 20, width: resolved.width || 15, height: resolved.height || 10, qty: 1 }];

    const totalWeight = resolved.totalWeight;
    const totalCubedWeight = volumes.reduce((s, v) => {
        return s + (v.length * v.width * v.height * v.qty) / (1000000 / cubageFactor);
    }, 0);
    const chargedWeight = Math.max(totalWeight, totalCubedWeight);
    const totalVolumes = volumes.reduce((s, v) => s + v.qty, 0);

    // 3. Find carriers
    const db = await getDb();
    const policies = await db.select().from(carrierPolicies).where(and(
        eq(carrierPolicies.tenantId, tenantId),
        eq(carrierPolicies.isActive, true),
    ));
    const carrierNames = policies.map(p => p.carrierName);

    if (carrierNames.length === 0) return null;

    // 4. Quote each carrier
    const largest = volumes.reduce((best, v) =>
        (v.length * v.width * v.height) > (best.length * best.width * best.height) ? v : best,
        volumes[0],
    );

    const quotes: { carrier: string; price: number; deadline: number }[] = [];

    for (const cn of carrierNames) {
        try {
            const adapter = new TableDrivenAdapter(cn, tenantId);
            const breakdown = await adapter.calculateFreight({
                originCep,
                destinationCep: cepRaw,
                weightInKg: chargedWeight,
                widthCm: largest.width,
                heightCm: largest.height,
                lengthCm: largest.length,
                insuranceValue: 0,
                packageType: 'box',
            });

            if (breakdown && breakdown.totalFreight > 0) {
                quotes.push({
                    carrier: cn,
                    price: Math.round(breakdown.totalFreight * 100) / 100,
                    deadline: breakdown.deliveryDays || 0,
                });
            }
        } catch {
            continue;
        }
    }

    quotes.sort((a, b) => a.price - b.price);

    // 5. Log simulation
    const bestQuote = quotes[0];
    const simulationId = await logFreightSimulation({
        tenantId,
        cep: cepRaw,
        zoneCode: undefined,
        carrierConsidered: carrierNames,
        carrierSelected: bestQuote?.carrier,
        totalWeight,
        cubedWeight: totalCubedWeight,
        chargedWeight,
        totalVolumes,
        volumeDetails: volumes,
        dimensionSource: resolved.source,
        packingRuleVersion: opSettings.ruleVersion,
        quotedFreight: bestQuote?.price,
        breakdownJson: quotes,
        strategyUsed: 'whatsapp_auto_quote',
    });

    return { simulationId, quotes };
}
