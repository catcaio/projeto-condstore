import { suggestionRepository } from './suggestion.repository';
import {
    emitSuggestionGenerated,
    emitSuggestionApproved,
    emitSuggestionEdited,
    emitSuggestionRejected
} from './suggestion.events';
import { CreateSuggestionDTO, ApproveSuggestionDTO } from './suggestion.types';
import { logger } from '@/infra/logger';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';

export class SuggestionService {
    async generateSuggestion(tenantId: string, sessionId: string, dto: CreateSuggestionDTO): Promise<string> {
        const id = await suggestionRepository.create({
            tenantId,
            conversationId: dto.conversationId,
            sessionId,
            intent: dto.intent,
            entities: dto.entities || null,
            playbookId: dto.playbookId || null,
            suggestedResponse: dto.suggestedResponse,
            confidence: String(dto.confidence),
            status: 'generated',
            approvedBy: null,
            approvedAt: null,
        });

        const evtPayload = {
            suggestionId: id,
            sessionId,
            conversationId: dto.conversationId,
            intent: dto.intent,
            confidence: dto.confidence
        };

        logger.info('frank_suggestion_generated', evtPayload);
        emitSuggestionGenerated(tenantId, evtPayload);

        return id;
    }

    async approveSuggestion(tenantId: string, id: string, dto: ApproveSuggestionDTO): Promise<boolean> {
        const existing = await suggestionRepository.findById(tenantId, id);
        if (!existing) return false;

        const isEdited = !!(dto.finalResponse && dto.finalResponse !== existing.suggestedResponse);
        const status = isEdited ? 'edited' : 'approved';

        const ok = await suggestionRepository.updateStatus(
            tenantId,
            id,
            status,
            dto.operatorId,
            dto.finalResponse
        );

        if (ok) {
            const payload = {
                suggestionId: id,
                sessionId: existing.sessionId,
                approvedBy: dto.operatorId,
                edited: isEdited
            };

            logger.info(`frank_suggestion_${status}`, payload);
            await operationalAuditService.logActivity({
                tenantId,
                entityType: 'suggestion',
                entityId: id,
                actorId: dto.operatorId,
                actionType: `suggestion_${status}`,
                beforeState: {
                    status: existing.status,
                    suggestedResponse: existing.suggestedResponse,
                },
                afterState: {
                    status,
                    suggestedResponse: dto.finalResponse ?? existing.suggestedResponse,
                },
                origin: 'frank',
                metadata: {
                    conversationId: existing.conversationId,
                    sessionId: existing.sessionId,
                    intent: existing.intent,
                    decisionContext: {
                        edited: isEdited,
                    },
                },
            });
            if (isEdited) emitSuggestionEdited(tenantId, payload);
            else emitSuggestionApproved(tenantId, payload);
        }

        return ok;
    }

    async rejectSuggestion(tenantId: string, id: string, operatorId: string): Promise<boolean> {
        const existing = await suggestionRepository.findById(tenantId, id);
        if (!existing) return false;

        const ok = await suggestionRepository.updateStatus(
            tenantId,
            id,
            'rejected',
            operatorId
        );

        if (ok) {
            const payload = {
                suggestionId: id,
                sessionId: existing.sessionId,
                rejectedBy: operatorId
            };
            logger.info('frank_suggestion_rejected', payload);
            await operationalAuditService.logActivity({
                tenantId,
                entityType: 'suggestion',
                entityId: id,
                actorId: operatorId,
                actionType: 'suggestion_rejected',
                beforeState: {
                    status: existing.status,
                    suggestedResponse: existing.suggestedResponse,
                },
                afterState: {
                    status: 'rejected',
                    suggestedResponse: existing.suggestedResponse,
                },
                origin: 'frank',
                metadata: {
                    conversationId: existing.conversationId,
                    sessionId: existing.sessionId,
                    intent: existing.intent,
                    decisionContext: {
                        rejected: true,
                    },
                },
            });
            emitSuggestionRejected(tenantId, payload);
        }

        return ok;
    }

    async listPendingSuggestions(tenantId: string, conversationId?: string) {
        return suggestionRepository.listPending(tenantId, conversationId);
    }
}

export const suggestionService = new SuggestionService();
