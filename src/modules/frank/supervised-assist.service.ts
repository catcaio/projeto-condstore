import { resolveIntent, type Intent } from './intent-resolver';
import { resolveEntities, type ExtractedEntities } from './entity-resolver';
import { resolvePlaybook } from './playbooks/playbook.service';
import { resolveKnowledge } from './knowledge/knowledge.service';
import { suggestionService } from './suggestions/suggestion.service';
import { isFrankSupervisedOnly } from '@/config/app.config';
import { logger } from '@/infra/logger';
import { catalogService } from '@/modules/catalog/catalog.service';
import { freightService } from '@/modules/freight/freight.service';
import {
    formatFreightQuoteResponse,
    formatProductInquiryResponse,
    formatProductSuggestions,
} from '@/lib/formatters/whatsapp-response';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface SupervisedSuggestionOutput {
    intent: Intent;
    entities: ExtractedEntities;
    playbookId: string | null;
    suggestedResponse: string;
    confidence: number;
    outcome: 'success' | 'fallback' | 'skipped';
}

function extractCep(message: string): string | null {
    const match = message.match(/\b(\d{5})[-\s]?(\d{3})\b/);
    return match ? `${match[1]}${match[2]}` : null;
}

export const supervisedAssistService = {
    async generatePassiveSuggestion(
        tenantId: string,
        conversationId: string,
        sessionId: string,
        message: string
    ): Promise<SupervisedSuggestionOutput> {
        if (!isFrankSupervisedOnly()) {
            return {
                intent: 'OUTRO',
                entities: {} as ExtractedEntities,
                playbookId: null,
                suggestedResponse: '',
                confidence: 0,
                outcome: 'skipped'
            };
        }

        const intentResult = resolveIntent(message);
        const entityResult = resolveEntities(message);
        const cep = extractCep(message);

        const playbook = await resolvePlaybook({
            tenantId,
            intent: intentResult.intent,
            entities: entityResult.entities,
        });

        let suggestedResponse = 'Não consegui formular uma sugestão clara para esta mensagem.';
        let outcome: 'success' | 'fallback' = 'fallback';

        const productQuery = entityResult.entities.product;
        const quantity = entityResult.entities.quantity ?? 1;

        if (productQuery) {
            const products = await catalogService.searchProductsByName(tenantId, productQuery);
            if (products.length > 0) {
                await publishOperationalEvent({
                    tenantId,
                    eventDomain: 'OPERATIONS',
                    eventType: 'product_detected',
                    sessionId,
                    payload: { conversationId, productId: products[0].productId, productQuery },
                });

                if (products.length === 1) {
                    suggestedResponse = formatProductInquiryResponse(products[0]);

                    if (cep && quantity > 0) {
                        const quote = await freightService.calculateFreight({
                            tenantId,
                            destinationCep: cep,
                            quantity,
                            productRef: products[0].productId,
                            unitWeight: products[0].weight,
                        });

                        const best = quote.options[0];
                        if (best) {
                            suggestedResponse = `${suggestedResponse}\n\n${formatFreightQuoteResponse({
                                cep,
                                freightPrice: best.price,
                                estimatedDays: best.deliveryTime,
                                carrier: best.carrier,
                            })}`;

                            await publishOperationalEvent({
                                tenantId,
                                eventDomain: 'OPERATIONS',
                                eventType: 'freight_quoted',
                                sessionId,
                                payload: {
                                    conversationId,
                                    productId: products[0].productId,
                                    quantity,
                                    destinationZip: cep,
                                    carrier: best.carrier,
                                },
                            });
                        }
                    }
                } else {
                    suggestedResponse = formatProductSuggestions(products);
                }

                outcome = 'success';
            }
        }

        if (outcome !== 'success' && playbook) {
            suggestedResponse = `${playbook.responseBase}\n\n${playbook.nextStepSuggestion ?? ''}`.trim();
            outcome = 'success';
        } else if (outcome !== 'success') {
            const knowledgeEntry = await resolveKnowledge(tenantId, message, sessionId);
            if (knowledgeEntry) {
                suggestedResponse = knowledgeEntry.content;
                outcome = 'success';
            }
        }

        if (outcome === 'success') {
            await suggestionService.generateSuggestion(tenantId, sessionId, {
                conversationId,
                intent: intentResult.intent,
                entities: entityResult.entities,
                playbookId: playbook ? playbook.playbookId : undefined,
                suggestedResponse,
                confidence: intentResult.confidence,
            }).catch(e => {
                logger.error('frank_suggestion_failed_to_save', e as Error, { tenantId });
            });

            await publishOperationalEvent({
                tenantId,
                eventType: 'suggestion_created',
                eventDomain: 'OPERATIONS',
                sessionId,
                payload: { conversationId, intent: intentResult.intent },
            });
        }

        return {
            intent: intentResult.intent,
            entities: entityResult.entities,
            playbookId: playbook ? playbook.playbookId : null,
            suggestedResponse,
            confidence: intentResult.confidence,
            outcome
        };
    }
};
