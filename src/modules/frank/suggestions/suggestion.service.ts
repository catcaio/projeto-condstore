import { suggestionRepository } from './suggestion.repository';
import {
    emitSuggestionGenerated,
    emitSuggestionApproved,
    emitSuggestionEdited,
    emitSuggestionRejected
} from './suggestion.events';
import { CreateSuggestionDTO, ApproveSuggestionDTO, FrankSuggestion } from './suggestion.types';
import { logger } from '@/infra/logger';

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

        const isEdited = dto.finalResponse && dto.finalResponse !== existing.suggestedResponse;
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
            emitSuggestionRejected(tenantId, payload);
        }

        return ok;
    }

    async listPendingSuggestions(tenantId: string, conversationId?: string) {
        return suggestionRepository.listPending(tenantId, conversationId);
    }
}

export const suggestionService = new SuggestionService();
