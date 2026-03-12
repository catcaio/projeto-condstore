import { intentRepository } from '@/modules/frank/intents/intent.repository';
import { intentLinkerRepository } from './intent-linker.repository';
import { createPlaybook, getPlaybookById } from '@/modules/frank/playbooks/playbook.repository';
import { emitIntentLinkedToPlaybook, emitIntentConvertedToPlaybook } from './intent-linker.events';
import { CreatePlaybookFromIntentDTO } from './intent-linker.types';

export class IntentLinkerService {
    async linkExistingPlaybook(tenantId: string, intentId: string, playbookId: string, operatorId: string): Promise<boolean> {
        const intent = await intentRepository.findById(tenantId, intentId);
        if (!intent) {
            throw new Error('Intent not found');
        }

        const playbook = await getPlaybookById(tenantId, playbookId);
        if (!playbook) {
            throw new Error('Playbook not found');
        }

        const ok = await intentLinkerRepository.updateLinkStatus(tenantId, intentId, playbookId, 'linked');
        
        if (ok) {
            emitIntentLinkedToPlaybook(tenantId, {
                intentId,
                playbookId,
                detectedIntent: intent.detectedIntent || null,
                linkedBy: operatorId,
            });
        }

        return ok;
    }

    async createPlaybookFromIntent(tenantId: string, intentId: string, dto: CreatePlaybookFromIntentDTO, operatorId: string): Promise<string> {
        const intent = await intentRepository.findById(tenantId, intentId);
        if (!intent) {
            throw new Error('Intent not found');
        }

        const createdId = await createPlaybook({
            tenantId,
            title: dto.name,
            intent: dto.intent,
            triggerPhrases: dto.triggerPhrases,
            relatedEntities: dto.relatedEntities,
            responseBase: dto.responseBase,
            responseShort: dto.responseShort || undefined,
            nextStepSuggestion: dto.nextStepSuggestion || undefined,
            requiresConfirmation: dto.requiresConfirmation,
            requiresHumanHandoff: dto.requiresHumanHandoff,
            handoffConditions: dto.handoffConditions || undefined,
            tags: dto.tags,
            priority: dto.priority,
            status: dto.status,
        });

        const ok = await intentLinkerRepository.updateLinkStatus(tenantId, intentId, createdId, 'converted_to_playbook');

        if (ok) {
            emitIntentConvertedToPlaybook(tenantId, {
                intentId,
                playbookId: createdId,
                detectedIntent: intent.detectedIntent || null,
                convertedBy: operatorId,
            });
        }

        return createdId;
    }
}

export const intentLinkerService = new IntentLinkerService();
