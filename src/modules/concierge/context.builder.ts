// ---------------------------------------------------------------------------
// Context Builder — orchestrates intent rules, validation, minimisation,
// and produces a typed ConciergeContext. Pure processing, no I/O.
// ---------------------------------------------------------------------------

import type { ConciergeIntent, ConciergeContext } from './concierge.types';
import { getIntentRule } from './intent.engine';
import {
    validateRequiredFields,
    validateForbiddenFields,
    enforceTenantRequirement,
    applyMinimization,
} from './concierge.policy';

/**
 * Build a validated and minimised ConciergeContext from raw user input.
 *
 * Pipeline:
 * 1. Resolve field rule for the intent.
 * 2. Validate required fields.
 * 3. Validate no forbidden fields are present.
 * 4. Enforce tenant requirement.
 * 5. Apply data minimisation.
 * 6. Return typed context.
 *
 * @throws {Error} if any validation step fails.
 */
export function buildConciergeContext(
    intent: ConciergeIntent,
    rawInput: Record<string, unknown>,
    tenantId?: string,
    sessionId?: string,
): ConciergeContext {
    const rule = getIntentRule(intent);

    // Policy pipeline
    validateRequiredFields(rawInput, rule);
    validateForbiddenFields(rawInput, rule);
    enforceTenantRequirement({ tenantId }, rule);

    const minimised = applyMinimization(rawInput, rule);

    return {
        intent,
        tenantId,
        sessionId,
        createdAt: new Date(),
        fields: minimised,
    };
}
