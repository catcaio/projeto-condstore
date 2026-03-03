// ---------------------------------------------------------------------------
// Event Catalog — maps each OrchestratorEventType to its default severity,
// policy constraints, and redaction key patterns.
// ---------------------------------------------------------------------------

import type { OrchestratorEventType, OrchestratorSeverity, OrchestratorSource } from './orchestrator.types';

/** Keys that must ALWAYS be redacted from any orchestrator payload (LGPD). */
export const GLOBAL_REDACTION_KEYS: ReadonlySet<string> = new Set([
    'token',
    'secret',
    'authorization',
    'cookie',
    'phone',
    'email',
    'password',
    'cpf',
    'cnpj',
    'apikey',
    'api_key',
    'creditcard',
    'credit_card',
]);

/** Policy definition for a single event type. */
export interface EventCatalogEntry {
    defaultSeverity: OrchestratorSeverity;
    allowedSources: readonly OrchestratorSource[];
    requiresTenantId: boolean;
    /** Extra keys to redact beyond GLOBAL_REDACTION_KEYS (per-type). */
    extraRedactionKeys: readonly string[];
}

/**
 * Authoritative catalog of all orchestrator event types.
 *
 * Every new event MUST be registered here before it can flow through the
 * orchestrator service.
 */
export const EVENT_CATALOG: Record<OrchestratorEventType, EventCatalogEntry> = {
    public_intent_created: {
        defaultSeverity: 'info',
        allowedSources: ['public'],
        requiresTenantId: false,
        extraRedactionKeys: [],
    },
    public_quotes_generated: {
        defaultSeverity: 'info',
        allowedSources: ['public'],
        requiresTenantId: false,
        extraRedactionKeys: [],
    },
    domine_event_published: {
        defaultSeverity: 'info',
        allowedSources: ['cockpit', 'domine', 'frank'],
        requiresTenantId: true,
        extraRedactionKeys: [],
    },
    domine_event_processed: {
        defaultSeverity: 'info',
        allowedSources: ['domine'],
        requiresTenantId: true,
        extraRedactionKeys: [],
    },
    domine_event_failed: {
        defaultSeverity: 'critical',
        allowedSources: ['domine'],
        requiresTenantId: true,
        extraRedactionKeys: [],
    },
    frank_action_requested: {
        defaultSeverity: 'info',
        allowedSources: ['frank', 'cockpit'],
        requiresTenantId: true,
        extraRedactionKeys: ['messageBody'],
    },
    frank_action_failed: {
        defaultSeverity: 'warning',
        allowedSources: ['frank'],
        requiresTenantId: true,
        extraRedactionKeys: ['messageBody'],
    },
    privacy_purge_requested: {
        defaultSeverity: 'warning',
        allowedSources: ['cockpit', 'system'],
        requiresTenantId: true,
        extraRedactionKeys: [],
    },
    privacy_purge_completed: {
        defaultSeverity: 'info',
        allowedSources: ['system'],
        requiresTenantId: true,
        extraRedactionKeys: [],
    },
    incident_raised: {
        defaultSeverity: 'critical',
        allowedSources: ['public', 'cockpit', 'domine', 'frank', 'system'],
        requiresTenantId: false,
        extraRedactionKeys: [],
    },
    human_escalation_requested: {
        defaultSeverity: 'critical',
        allowedSources: ['public', 'cockpit', 'domine', 'frank', 'system'],
        requiresTenantId: false,
        extraRedactionKeys: [],
    },
} as const;
