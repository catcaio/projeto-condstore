import { resolveIntent, type Intent } from './intent-resolver';
import { resolveEntities, type ExtractedEntities, detectedEntityTypes } from './entity-resolver';
import { resolvePlaybook } from './playbooks/playbook.service';
import { resolveKnowledge } from './knowledge/knowledge.service';
import { suggestionService } from './suggestions/suggestion.service';
import { isFrankSupervisedOnly } from '@/config/app.config';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';

export interface SupervisedSuggestionOutput {
    intent: Intent;
    entities: ExtractedEntities;
    playbookId: string | null;
    suggestedResponse: string;
    confidence: number;
    outcome: 'success' | 'fallback' | 'skipped';
}

export const supervisedAssistService = {
    /**
     * Engine de Sugestão
     * Flow: message -> intent -> entity -> playbook -> knowledge -> response -> suggestion
     */
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

        // 1. Intent Resolver
        const intentResult = resolveIntent(message);

        // 2. Entity Resolver
        const entityResult = resolveEntities(message);

        structuredLogger.info('frank_intent_detected', {
            eventType: 'FRANK_INTENT_DETECTED',
            tenantId,
            conversationId,
            intentDetected: intentResult.intent,
            confidence: intentResult.confidence,
            intentCandidates: intentResult.intentCandidates ?? [],
            entitiesDetected: detectedEntityTypes(entityResult.entities),
            entitiesResolved: entityResult.entities,
            source: 'whatsapp',
        });

        // 3. Playbook Resolver
        const playbook = await resolvePlaybook({
            tenantId,
            intent: intentResult.intent,
            entities: entityResult.entities,
        });

        let suggestedResponse = 'Posso ajudar com preço, frete ou disponibilidade. Pode me informar mais detalhes?';
        let outcome: 'success' | 'fallback' = 'fallback';
        let source: 'playbook' | 'knowledge' | 'llm' | 'fallback' = 'fallback';

        if (playbook) {
            suggestedResponse = `${playbook.responseBase}\n\n${playbook.nextStepSuggestion ?? ''}`.trim();
            outcome = 'success';
            source = 'playbook';
        } else {
            // 4. Knowledge Lookup
            const knowledgeEntry = await resolveKnowledge(tenantId, message, sessionId);
            if (knowledgeEntry) {
                suggestedResponse = knowledgeEntry.content;
                outcome = 'success';
                source = 'knowledge';
            }
        }

        // 5. Response Engine (saving)
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

            structuredLogger.info('frank_suggestion_generated', {
                eventType: 'FRANK_SUGGESTION_GENERATED',
                tenantId,
                conversationId,
                intent: intentResult.intent,
                source,
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
