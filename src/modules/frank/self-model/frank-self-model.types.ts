/**
 * frank-self-model.types.ts
 * Type definitions for Frank's Operational Self-Model.
 * Part of Phase 1: Operational Self-Model (Frank Evolution Platform).
 */

export type BeliefType = 'FACT' | 'INFERENCE' | 'HYPOTHESIS';

export interface BeliefProvenance {
    source: string; // e.g. "operational_events", "frank_token_usage", "observer", "execution_state"
    evidenceId?: string;
    description: string;
    timestamp: string;
}

export interface BeliefItem<T = unknown> {
    id: string;
    type: BeliefType;
    value: T;
    confidence: number; // 0.0 to 1.0
    provenance: BeliefProvenance;
}

export interface CapabilityState {
    name: string;
    domain: string; // e.g., 'atendimento', 'frete', 'pedidos', 'logistica', 'cockpit'
    description: string;
    status: 'ACTIVE' | 'DEGRADED' | 'EXPERIMENTAL' | 'INACTIVE';
    dependencies: string[]; // List of required capabilities or tools
}

export interface ToolReliability {
    toolName: string;
    status: 'RELIABLE' | 'FRAGILE' | 'UNTESTED' | 'BLOCKED';
    totalExecutions: number;
    successRate: number | null; // null for UNTESTED, 0.0 to 100.0 when tested
    avgLatencyMs: number | null; // null when specific latency telemetry is unmeasured
    errorRate: number | null; // null for UNTESTED
    lastExecutedAt: string | null; // Real last execution timestamp, null if unexecuted in window
}

export interface TaskClassPerformance {
    taskClass: string; // e.g. 'cotação_frete', 'criação_pedido', 'atendimento_whatsapp'
    totalRequests: number;
    successRate: number | null; // segmented per class, null if no requests or unmeasured
    humanInterventionRate: number | null; // segmented per class
    avgLatencyMs: number | null; // segmented per class
    avgTokensPerCall: number;
    estimatedCostUsd: number;
}

export interface FailureMode {
    id: string;
    code: string; // e.g. 'SEMANTIC_INVALID', 'POLICY_BLOCKED', 'TIMEOUT'
    description: string;
    frequency: number;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedCapabilities: string[];
    firstSeenAt: string;
    lastSeenAt: string;
}

export interface FailureHypothesis {
    id: string;
    failureModeId: string;
    suspectedCause: string;
    expectedMechanism: string; // Describes unconfirmed expected causal mechanism
    confidence: number; // 0.0 to 1.0
    proposedIntervention?: string;
    status: 'OPEN' | 'TESTING' | 'CONFIRMED' | 'REJECTED';
    provenance: BeliefProvenance;
}

export interface ChangeHistoryRecord {
    id: string;
    version: string;
    appliedAt: string;
    changeType: 'MUTATION' | 'PROMOTION' | 'POLICY_UPDATE' | 'CONFIGURATION' | 'INITIALIZATION';
    description: string;
    observedEffects: {
        metric: string;
        before: number | string;
        after: number | string;
        verdict: 'IMPROVED' | 'NEUTRAL' | 'REGRESSED' | 'BASELINE';
    }[];
}

export type EvidenceStatus = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';

export interface FrankSelfModel {
    version: string; // e.g. "1.0.0-sm"
    tenantId: string;
    timestamp: string;
    evidenceStatus: EvidenceStatus;
    evidenceNotes?: string[];

    // Core capabilities and dependencies
    capabilities: CapabilityState[];
    knownLimitations: BeliefItem<string>[];

    // Task performance & resource usage
    taskClasses: TaskClassPerformance[];
    toolReliabilities: ToolReliability[];

    // Aggregate operational indicators
    operationalCost: {
        totalTokens: number;
        estimatedCostUsd: number;
        trackedCalls: number;
    };
    overallAvgLatencyMs: number | null;

    // Failures and hypotheses
    failureModes: FailureMode[];
    failureHypotheses: FailureHypothesis[];

    // Evolution & Lineage history
    changeHistory: ChangeHistoryRecord[];

    // Structured beliefs with explicit factual / inferential / hypothetical classification
    beliefs: BeliefItem[];
}
