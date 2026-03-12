import { findApprovedPlaybooksForIntent } from './playbook.repository';
import type { FrankPlaybookRecord } from '@/drizzle/schema';
import type { ExtractedEntities } from '../entity-resolver';
import type { Intent } from '../intent-resolver';

export interface PlaybookResolveInput {
    tenantId: string;
    intent: Intent;
    entities: ExtractedEntities;
}

export interface ResolvedPlaybook {
    playbookId: string;
    responseBase: string;
    responseShort: string | null;
    nextStepSuggestion: string | null;
    requiresConfirmation: boolean;
    requiresHumanHandoff: boolean;
}

/**
 * Resolves the best active playbook for a given intent and entities.
 * 
 * Rules:
 * 1. Only looks for "approved" playbooks for the specific intent.
 * 2. If a playbook has `relatedEntities`, ALL of them must be present in the extracted/active entities.
 * 3. Returns the first complete match (already ordered by priority desc).
 */
export async function resolvePlaybook(input: PlaybookResolveInput): Promise<ResolvedPlaybook | null> {
    const { tenantId, intent, entities } = input;

    // Ordered by priority DESC
    const candidates = await findApprovedPlaybooksForIntent(tenantId, intent);

    for (const playbook of candidates) {
        if (isEntityMatch(playbook, entities)) {
            return {
                playbookId: playbook.id,
                responseBase: playbook.responseBase,
                responseShort: playbook.responseShort,
                nextStepSuggestion: playbook.nextStepSuggestion,
                requiresConfirmation: playbook.requiresConfirmation ?? false,
                requiresHumanHandoff: playbook.requiresHumanHandoff ?? false,
            };
        }
    }

    return null;
}

/**
 * Checks if the message entities satisfy the playbook's required relatedEntities.
 */
function isEntityMatch(playbook: FrankPlaybookRecord, entities: ExtractedEntities): boolean {
    const reqEntities = playbook.relatedEntities ?? [];
    if (!reqEntities || reqEntities.length === 0) return true; // No specific requirements, matches automatically

    for (const req of reqEntities) {
        if (req === 'product' && !entities.product) return false;
        if (req === 'orderId' && !entities.orderId) return false;
        if (req === 'quantity' && !entities.quantity) return false;
        if (req === 'documentType' && !entities.documentType) return false;
    }

    return true; // All required entities present
}
