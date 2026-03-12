import { intentRepository } from './intent.repository';
import {
    emitIntentCaptured,
    emitIntentValidated,
    emitIntentIgnored
} from './intent.events';
import { CreateIntentTrainingDTO } from './intent.types';
import { logger } from '@/infra/logger';

export class IntentTrainingService {
    async captureIntent(tenantId: string, sessionId: string, dto: CreateIntentTrainingDTO): Promise<string> {
        const id = await intentRepository.create({
            tenantId,
            conversationId: dto.conversationId || null,
            messageId: dto.messageId || null,
            messageText: dto.messageText,
            detectedIntent: dto.detectedIntent || null,
            entities: dto.entities || null,
            confidence: dto.confidence ? String(dto.confidence) : null,
            status: 'captured',
        });

        const evtPayload = {
            intentId: id,
            sessionId,
            conversationId: dto.conversationId,
            messageId: dto.messageId,
            detectedIntent: dto.detectedIntent,
            confidence: dto.confidence
        };

        logger.info('intent_captured', evtPayload);
        emitIntentCaptured(tenantId, evtPayload);

        return id;
    }

    async validateIntent(tenantId: string, id: string, operatorId: string): Promise<boolean> {
        const existing = await intentRepository.findById(tenantId, id);
        if (!existing) return false;

        const ok = await intentRepository.updateStatus(tenantId, id, 'validated');

        if (ok) {
            const payload = {
                intentId: id,
                validatedBy: operatorId
            };

            logger.info('intent_validated', payload);
            emitIntentValidated(tenantId, payload);
        }

        return ok;
    }

    async ignoreIntent(tenantId: string, id: string, operatorId: string): Promise<boolean> {
        const existing = await intentRepository.findById(tenantId, id);
        if (!existing) return false;

        const ok = await intentRepository.updateStatus(tenantId, id, 'ignored');

        if (ok) {
            const payload = {
                intentId: id,
                ignoredBy: operatorId
            };
            logger.info('intent_ignored', payload);
            emitIntentIgnored(tenantId, payload);
        }

        return ok;
    }

    async listCapturedIntents(tenantId: string) {
        return intentRepository.listCaptured(tenantId);
    }
}

export const intentTrainingService = new IntentTrainingService();
