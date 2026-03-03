// ---------------------------------------------------------------------------
// Orchestrator Service — minimal API surface for strategic fact registration,
// incident reporting, and human escalation requests.
//
// Uses EXISTING storage:
//   - publicEventsRepository  → for source:"public" events
//   - auditService            → for tenant-scoped events (all other sources)
//
// No new DB table is introduced.
// ---------------------------------------------------------------------------

import type {
    OrchestratorEventType,
    OrchestratorContext,
    OrchestratorResult,
} from './orchestrator.types';
import {
    validateContext,
    sanitizePayload,
    computeSeverity,
    buildTags,
} from './orchestrator.policy';
import { structuredLogger } from '@/infra/log/logger';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';
import { auditService } from '@/modules/audit/audit.service';

// ── Internal persistence router ─────────────────────────────────────────────

async function persist(
    id: string,
    type: OrchestratorEventType,
    context: OrchestratorContext,
    sanitized: Record<string, unknown>,
    tags: string[],
): Promise<void> {
    if (context.source === 'public') {
        // Route to public_events table
        await publicEventsRepository.create({
            id,
            tenantId: context.tenantId ?? process.env.PUBLIC_TENANT_ID ?? '',
            eventType: `orchestrator:${type}`,
            anonId: context.sessionId ?? '',
            attributionId: context.correlationId ?? '',
            ipHash: '',
            uaHash: '',
            payloadJson: { ...sanitized, tags },
        });
    } else if (context.tenantId) {
        // Route to admin_audit_log via audit service
        await auditService.logEvent(
            context.tenantId,
            `ORCHESTRATOR_${type.toUpperCase()}` as Parameters<typeof auditService.logEvent>[1],
            { ...sanitized, tags, requestId: context.requestId },
        );
    } else {
        // Fallback: log-only for system events without tenantId
        structuredLogger.info('orchestrator_event_log_only', {
            requestId: context.requestId,
            eventType: `orchestrator:${type}`,
        });
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Register a strategic business fact in the orchestration layer.
 *
 * Validates context, sanitises the payload (LGPD), computes severity,
 * generates tags, then persists through the appropriate storage backend.
 */
export async function registerStrategicFact(
    type: OrchestratorEventType,
    context: OrchestratorContext,
    payload: Record<string, unknown>,
): Promise<OrchestratorResult> {
    const id = crypto.randomUUID();

    // Policy enforcement
    validateContext(type, context);

    const sanitized = sanitizePayload(type, payload);
    const severity = computeSeverity(type, payload);
    const tags = buildTags(type, context, sanitized);

    // Structured log (metadata only — never raw payload)
    structuredLogger.info('orchestrator_fact_registered', {
        requestId: context.requestId,
        tenantId: context.tenantId,
        eventType: type,
        severity,
        tagsCount: tags.length,
    } as Record<string, unknown>);

    await persist(id, type, context, sanitized, tags);

    return { ok: true, recordId: id };
}

/**
 * Register a critical incident (auto-severity = critical).
 */
export async function registerIncident(
    context: OrchestratorContext,
    payload: Record<string, unknown>,
): Promise<OrchestratorResult> {
    return registerStrategicFact('incident_raised', context, {
        ...payload,
        severity: 'critical',
    });
}

/**
 * Request human escalation (e.g. future Telegram integration point).
 */
export async function requestHumanEscalation(
    context: OrchestratorContext,
    payload: Record<string, unknown>,
): Promise<OrchestratorResult> {
    return registerStrategicFact('human_escalation_requested', context, {
        ...payload,
        severity: 'critical',
    });
}
