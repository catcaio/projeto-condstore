// ---------------------------------------------------------------------------
// Policy Engine — pure functions for severity computation, context validation,
// payload sanitisation (LGPD deep redaction), and automatic tag generation.
// ---------------------------------------------------------------------------

import type {
    OrchestratorEventType,
    OrchestratorSeverity,
    OrchestratorContext,
} from './orchestrator.types';
import { EVENT_CATALOG, GLOBAL_REDACTION_KEYS } from './orchestrator.events';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a key for comparison (lowercase, strip underscores/hyphens). */
function normaliseKey(key: string): string {
    return key.toLowerCase().replace(/[_-]/g, '');
}

// ── computeSeverity ─────────────────────────────────────────────────────────

/**
 * Compute effective severity for a given event type + payload.
 *
 * Rules:
 * 1. Start with the catalog default.
 * 2. If the payload contains `{ severity: "critical" | "warning" }` override
 *    upward (never downgrade).
 * 3. If payload has `{ attempts }` > 3 for failure types → escalate to critical.
 */
export function computeSeverity(
    type: OrchestratorEventType,
    payload: Record<string, unknown>,
): OrchestratorSeverity {
    const catalog = EVENT_CATALOG[type];
    let severity: OrchestratorSeverity = catalog.defaultSeverity;

    // Explicit severity override (only upgrade, never downgrade)
    const explicit = payload['severity'];
    if (explicit === 'critical') {
        severity = 'critical';
    } else if (explicit === 'warning' && severity === 'info') {
        severity = 'warning';
    }

    // Auto-escalate repeated failures
    const attempts = payload['attempts'];
    if (typeof attempts === 'number' && attempts > 3 && type.includes('failed')) {
        severity = 'critical';
    }

    return severity;
}

// ── validateContext ──────────────────────────────────────────────────────────

/**
 * Validate that the context satisfies the catalog policy for `type`.
 *
 * @throws {Error} with a sanitised message (never leaks PII).
 */
export function validateContext(
    type: OrchestratorEventType,
    context: OrchestratorContext,
): void {
    const catalog = EVENT_CATALOG[type];

    if (catalog.requiresTenantId && !context.tenantId) {
        throw new Error(
            `Orchestrator policy violation: event "${type}" requires tenantId but none was provided.`,
        );
    }

    if (!catalog.allowedSources.includes(context.source)) {
        throw new Error(
            `Orchestrator policy violation: source "${context.source}" is not allowed for event "${type}". ` +
            `Allowed: ${catalog.allowedSources.join(', ')}.`,
        );
    }
}

// ── sanitizePayload ─────────────────────────────────────────────────────────

/**
 * Deep-clone and redact sensitive keys from a payload object.
 *
 * Handles nested objects and arrays. Maximum depth = 5 to prevent
 * uncontrolled recursion.
 */
export function sanitizePayload(
    type: OrchestratorEventType,
    payload: Record<string, unknown>,
): Record<string, unknown> {
    const catalog = EVENT_CATALOG[type];
    const extraKeys = new Set(catalog.extraRedactionKeys.map(normaliseKey));

    function shouldRedact(key: string): boolean {
        const norm = normaliseKey(key);
        return GLOBAL_REDACTION_KEYS.has(norm) || extraKeys.has(norm);
    }

    function walk(value: unknown, depth: number): unknown {
        if (depth > 5) return '[DEPTH_EXCEEDED]';
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map((item) => walk(item, depth + 1));
        }

        if (typeof value === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                out[k] = shouldRedact(k) ? '[REDACTED]' : walk(v, depth + 1);
            }
            return out;
        }

        return String(value);
    }

    return walk(payload, 0) as Record<string, unknown>;
}

// ── buildTags ───────────────────────────────────────────────────────────────

/**
 * Generate deterministic tags for indexing / filtering.
 */
export function buildTags(
    type: OrchestratorEventType,
    context: OrchestratorContext,
    _payload: Record<string, unknown>,
): string[] {
    const tags: string[] = [
        `type:${type}`,
        `source:${context.source}`,
    ];

    if (context.tenantId) {
        tags.push(`tenant:${context.tenantId}`);
    }

    if (type.startsWith('domine_')) {
        tags.push('domain:domine');
    } else if (type.startsWith('frank_')) {
        tags.push('domain:frank');
    } else if (type.startsWith('privacy_')) {
        tags.push('domain:privacy');
    } else if (type.startsWith('public_')) {
        tags.push('domain:public');
    }

    return tags;
}
