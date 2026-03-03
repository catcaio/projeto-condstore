// ---------------------------------------------------------------------------
// Concierge Policy — pure validation and data-minimisation functions.
// No I/O, no DB, no side effects.
// ---------------------------------------------------------------------------

import type { ConciergeFieldRule, ConciergeContext } from './concierge.types';

/** Keys that are always allowed through minimisation (beyond `required`). */
const MINIMISATION_ALLOWLIST: ReadonlySet<string> = new Set([
    'sessionId',
    'requestId',
    'correlationId',
    'source',
]);

/**
 * Validate that all required fields are present in the input.
 * @throws {Error} listing missing fields.
 */
export function validateRequiredFields(
    input: Record<string, unknown>,
    rule: ConciergeFieldRule,
): void {
    const missing = rule.required.filter((key) => {
        const value = input[key];
        return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
        throw new Error(
            `Concierge policy: missing required fields: ${missing.join(', ')}`,
        );
    }
}

/**
 * Validate that no forbidden fields are present in the input.
 * @throws {Error} listing forbidden fields found.
 */
export function validateForbiddenFields(
    input: Record<string, unknown>,
    rule: ConciergeFieldRule,
): void {
    const found = rule.forbidden.filter((key) => input[key] !== undefined);

    if (found.length > 0) {
        throw new Error(
            `Concierge policy: forbidden fields present: ${found.join(', ')}`,
        );
    }
}

/**
 * Enforce tenant requirement.
 * @throws {Error} if tenantId is missing when the rule demands it.
 */
export function enforceTenantRequirement(
    context: Pick<ConciergeContext, 'tenantId'>,
    rule: ConciergeFieldRule,
): void {
    if (rule.requiresTenant && !context.tenantId) {
        throw new Error(
            'Concierge policy: tenantId is required for this intent but was not provided.',
        );
    }
}

/**
 * Apply data-minimisation: return a new object that contains only
 * the `required` fields and `MINIMISATION_ALLOWLIST` keys.
 * Forbidden fields are never returned even if present.
 */
export function applyMinimization(
    input: Record<string, unknown>,
    rule: ConciergeFieldRule,
): Record<string, unknown> {
    const forbiddenSet = new Set(rule.forbidden.map((k) => k.toLowerCase()));
    const requiredSet = new Set(rule.required.map((k) => k.toLowerCase()));

    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
        const lower = key.toLowerCase();

        // Never include forbidden
        if (forbiddenSet.has(lower)) continue;

        // Include if required or in allowlist
        if (requiredSet.has(lower) || MINIMISATION_ALLOWLIST.has(lower)) {
            out[key] = value;
        }
    }

    return out;
}
