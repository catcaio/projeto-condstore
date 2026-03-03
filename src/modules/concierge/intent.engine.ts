// ---------------------------------------------------------------------------
// Intent Engine — maps each ConciergeIntent to its field-level validation
// and data-minimisation rules.
// ---------------------------------------------------------------------------

import type { ConciergeIntent, ConciergeFieldRule } from './concierge.types';

const INTENT_RULES: Record<ConciergeIntent, ConciergeFieldRule> = {
    cotacao_simulada: {
        required: ['originCep', 'destinationCep', 'weight'],
        forbidden: ['cpf', 'cnpj', 'token', 'authorization'],
        ttlHours: 48,
        requiresTenant: false,
    },
    pedido: {
        required: ['productId', 'quantity'],
        forbidden: ['token'],
        ttlHours: 720,
        requiresTenant: true,
    },
    suporte: {
        required: ['orderId'],
        forbidden: ['authorization'],
        ttlHours: 2160,
        requiresTenant: true,
    },
};

/**
 * Return the field rule for the given intent.
 * Throws if the intent is not registered.
 */
export function getIntentRule(intent: ConciergeIntent): ConciergeFieldRule {
    const rule = INTENT_RULES[intent];
    if (!rule) {
        throw new Error(`Unknown concierge intent: "${intent as string}"`);
    }
    return rule;
}
