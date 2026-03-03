// ---------------------------------------------------------------------------
// Orchestrator Types — foundational types for the CONDSTORE OS orchestration
// layer. All event routing, policy enforcement, and telemetry flows through
// these contracts.
// ---------------------------------------------------------------------------

/** Every strategic fact the orchestrator can track. */
export type OrchestratorEventType =
    | 'public_intent_created'
    | 'public_quotes_generated'
    | 'domine_event_published'
    | 'domine_event_processed'
    | 'domine_event_failed'
    | 'frank_action_requested'
    | 'frank_action_failed'
    | 'privacy_purge_requested'
    | 'privacy_purge_completed'
    | 'incident_raised'
    | 'human_escalation_requested'
    | 'concierge_decision_made';

/** Severity classification for orchestrator records. */
export type OrchestratorSeverity = 'info' | 'warning' | 'critical';

/** Origin system that produced the event. */
export type OrchestratorSource = 'public' | 'cockpit' | 'domine' | 'frank' | 'system';

/** Contextual metadata attached to every orchestrator record. */
export interface OrchestratorContext {
    tenantId?: string;
    sessionId?: string;
    requestId?: string;
    source: OrchestratorSource;
    correlationId?: string;
}

/** A persisted orchestrator record. */
export interface OrchestratorRecord {
    id: string;
    createdAt: string;
    type: OrchestratorEventType;
    severity: OrchestratorSeverity;
    context: OrchestratorContext;
    payload: Record<string, unknown>;
    tags: string[];
}

/** Result returned by all orchestrator service functions. */
export interface OrchestratorResult {
    ok: true;
    recordId: string;
}
