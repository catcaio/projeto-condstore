import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { operationalEvents, frankSuggestions } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { formatFreightQuoteResponse, formatProductInquiryResponse, formatProductSuggestionsResponse } from '@/lib/formatters/whatsapp-response';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import { resolveEntities } from '@/modules/frank/entity-resolver';
import { resolveIntent } from '@/modules/frank/intent-resolver';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';

type Scenario = {
    name: string;
    message: string;
    expectProductLookup: boolean;
    expectFreight: boolean;
};

const scenarios: Scenario[] = [
    {
        name: 'Scenario 1',
        message: 'quanto custa carrinho 140 litros',
        expectProductLookup: true,
        expectFreight: false,
    },
    {
        name: 'Scenario 2',
        message: 'frete para cep 88034-000',
        expectProductLookup: true,
        expectFreight: true,
    },
    {
        name: 'Scenario 3',
        message: 'tem carrinho de 120?',
        expectProductLookup: true,
        expectFreight: false,
    },
    {
        name: 'Scenario 4',
        message: 'quero comprar 2 carrinhos',
        expectProductLookup: true,
        expectFreight: false,
    },
];

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function extractCep(message: string): string | null {
    return message.match(/\b\d{5}-?\d{3}\b/)?.[0].replace(/\D/g, '') ?? null;
}

function extractProductQuery(message: string, entities: ReturnType<typeof resolveEntities>['entities']): string {
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

async function run() {
    const tenantId = process.env.TEST_TENANT_ID || 'demo-tenant';
    const conversationId = process.env.TEST_CONVERSATION_ID || `scenario-conversation-${randomUUID()}`;
    const sessionId = process.env.TEST_SESSION_ID || `scenario-session-${randomUUID()}`;
    const db = await getDb();

    let lastResolvedProductId: string | null = null;
    let lastResolvedProductQuery: string | null = null;
    const scenarioFailures: string[] = [];

    for (const scenario of scenarios) {
        const intentResult = resolveIntent(scenario.message);
        const entityResult = resolveEntities(scenario.message);
        const destinationZip = extractCep(scenario.message);
        const quantity = resolveQuantity(scenario.message, entityResult.entities.quantity);
        const productQuery: string = extractProductQuery(scenario.message, entityResult.entities) || lastResolvedProductQuery || '';
        const products = productQuery ? await catalogService.searchProductsByName(tenantId, productQuery) : [];
        const primaryProduct = products[0] ?? null;

        if (scenario.expectProductLookup && products.length === 0 && !lastResolvedProductId) {
            scenarioFailures.push(`${scenario.name}: expected product lookup result but found none`);
        }

        await publishOperationalEvent({
            tenantId,
            eventType: 'message_received',
            eventDomain: 'OPERATIONS',
            sessionId,
            entityId: conversationId,
            payload: {
                scenario: scenario.name,
                message: scenario.message,
                intent: intentResult.intent,
            },
        });

        if (primaryProduct) {
            lastResolvedProductId = primaryProduct.productId;
            lastResolvedProductQuery = primaryProduct.name;

            await publishOperationalEvent({
                tenantId,
                eventType: 'product_detected',
                eventDomain: 'OPERATIONS',
                sessionId,
                entityId: conversationId,
                payload: {
                    scenario: scenario.name,
                    query: productQuery,
                    productId: primaryProduct.productId,
                    matches: products.length,
                },
            });
        }

        let suggestedResponse = products.length === 1
            ? formatProductInquiryResponse(products[0])
            : formatProductSuggestionsResponse(products);

        if (!productQuery && lastResolvedProductId) {
            suggestedResponse = 'Recuperei o último produto consultado para continuar a simulação supervisionada.';
        }

        if (scenario.expectFreight && destinationZip && (primaryProduct || lastResolvedProductId)) {
            const freightQuote = await freightService.simulateFreightQuote({
                tenantId,
                productId: primaryProduct?.productId ?? lastResolvedProductId!,
                quantity,
                destinationZip,
                unitWeight: primaryProduct?.weight,
            });

            suggestedResponse = `${suggestedResponse}\n\n${formatFreightQuoteResponse({
                destinationZip,
                freightPrice: freightQuote.freightPrice,
                estimatedDays: freightQuote.estimatedDays,
                carrier: freightQuote.carrier,
            })}`;

            await publishOperationalEvent({
                tenantId,
                eventType: 'freight_quoted',
                eventDomain: 'OPERATIONS',
                sessionId,
                entityId: conversationId,
                payload: {
                    scenario: scenario.name,
                    productId: primaryProduct?.productId ?? lastResolvedProductId,
                    freightPrice: freightQuote.freightPrice,
                    estimatedDays: freightQuote.estimatedDays,
                    carrier: freightQuote.carrier,
                },
            });
        }

        const suggestionId = await suggestionService.generateSuggestion(tenantId, sessionId, {
            conversationId,
            intent: scenario.expectFreight ? 'FRETE' : intentResult.intent,
            entities: {
                ...entityResult.entities,
                productQuery,
                productId: primaryProduct?.productId ?? lastResolvedProductId,
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
            sessionId,
            entityId: conversationId,
            payload: {
                scenario: scenario.name,
                suggestionId,
            },
        });

        console.log(`[${scenario.name}]`, {
            intent: intentResult.intent,
            entities: entityResult.entities,
            productQuery,
            productMatches: products.length,
            freightSimulated: Boolean(scenario.expectFreight && destinationZip && (primaryProduct || lastResolvedProductId)),
        });
    }

    const suggestionRows = await db
        .select({ id: frankSuggestions.id })
        .from(frankSuggestions)
        .where(and(eq(frankSuggestions.tenantId, tenantId), eq(frankSuggestions.sessionId, sessionId)));

    const eventRows = await db
        .select({ eventType: operationalEvents.eventType })
        .from(operationalEvents)
        .where(
            and(
                eq(operationalEvents.tenantId, tenantId),
                eq(operationalEvents.sessionId, sessionId),
                inArray(operationalEvents.eventType, [
                    'message_received',
                    'product_detected',
                    'freight_quoted',
                    'suggestion_created',
                ]),
            ),
        );

    const failures: string[] = [];

    if (eventRows.filter((row) => row.eventType === 'message_received').length < scenarios.length) {
        failures.push('message_received events are missing for one or more scenarios');
    }

    if (!eventRows.some((row) => row.eventType === 'product_detected')) {
        failures.push('no product_detected event was emitted');
    }

    if (!eventRows.some((row) => row.eventType === 'freight_quoted')) {
        failures.push('no freight_quoted event was emitted');
    }

    if (suggestionRows.length < scenarios.length) {
        failures.push('suggestions were not created for every scenario');
    }

    failures.push(...scenarioFailures);

    if (failures.length > 0) {
        console.error('scenario_validation_failed', failures);
        process.exitCode = 1;
        return;
    }

    console.log('scenario_validation_ok', {
        conversationId,
        sessionId,
        suggestions: suggestionRows.length,
        events: eventRows.length,
    });
}

run().catch((error) => {
    console.error('scenario_run_failed', error);
    process.exitCode = 1;
});
