/**
 * playbook-engine.ts
 * Operational memory layer where FRANK SUPREMO evaluates and auto-proposes actions for known findings.
 */

import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { supremePlaybooks, supremeFindings, type SupremeFindingRecord } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { proposeAction } from '@/lib/actions/action-engine';
import { ACTION_TYPE_TO_SCOPE, type ActionScope } from '@/lib/actions/action-types';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlaybookStep {
    action: string;
    delay_minutes: number;
    payloadTemplate?: Record<string, unknown>;
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Searches active playbooks matching newly generated findings and executes them.
 * Used automatically by FRANK SUPREMO Analyzer after findings persistence.
 */
export async function evaluatePlaybooks(tenantId: string, newFindings: Pick<SupremeFindingRecord, 'id' | 'findingType'>[]) {
    if (newFindings.length === 0) return { playbooksMatched: 0 };

    const db = await getDb();
    const uniqueTriggerTypes = Array.from(new Set(newFindings.map(f => f.findingType)));

    // Fetch active playbooks for these finding types
    const activePlaybooks = await db
        .select()
        .from(supremePlaybooks)
        .where(eq(supremePlaybooks.isActive, true));

    // Filter in JS is fine since the number of playbooks is small and global
    const matchedPlaybooks = activePlaybooks.filter(pb => uniqueTriggerTypes.includes(pb.triggerFindingType));
    if (matchedPlaybooks.length === 0) return { playbooksMatched: 0 };

    let executedCount = 0;

    for (const finding of newFindings) {
        // Find playbooks matching this specific finding
        const pbs = matchedPlaybooks.filter(pb => pb.triggerFindingType === finding.findingType);
        for (const pb of pbs) {
            try {
                await executePlaybook(pb.id, tenantId, finding.id);
                executedCount++;
            } catch (err: any) {
                structuredLogger.error('supreme_playbook_execution_failed', { tenantId, playbookId: pb.id, findingId: finding.id, error: err.message });
            }
        }
    }

    return { playbooksMatched: executedCount };
}

/**
 * Reads a playbook's action sequence and proposes the actions to the Action Engine.
 * Updates the finding status to ACTION_PROPOSED.
 */
export async function executePlaybook(playbookId: string, tenantId: string, findingId: string) {
    const db = await getDb();
    const pbs = await db.select().from(supremePlaybooks).where(eq(supremePlaybooks.id, playbookId)).limit(1);
    const playbook = pbs[0];
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`);
    if (!playbook.isActive) throw new Error(`Playbook ${playbookId} is disabled`);

    const fnds = await db.select().from(supremeFindings).where(eq(supremeFindings.id, findingId)).limit(1);
    const finding = fnds[0];
    if (!finding) throw new Error(`Finding ${findingId} not found`);

    const sequence = playbook.actionSequence as PlaybookStep[];
    if (!Array.isArray(sequence) || sequence.length === 0) throw new Error(`Playbook ${playbookId} has no action sequence`);

    const actionIds: string[] = [];

    // Propose actions defined in the playbook
    for (const step of sequence) {
        const scopeStr = ACTION_TYPE_TO_SCOPE[step.action];
        if (!scopeStr) throw new Error(`Unknown scope for action type: ${step.action}`);

        const result = await proposeAction({
            tenantId,
            actionType: step.action,
            actionScope: scopeStr as ActionScope,
            proposedBy: 'FRANK_SUPREMO', // Auto-proposal
            payload: {
                ...step.payloadTemplate,
                _sourcePlaybookId: playbook.id,
                _sourceFindingId: findingId,
                _executionDelayMinutes: step.delay_minutes, // Orchestrator handles delays later
            },
        });
        actionIds.push(result.id);
    }

    // Mark finding as ACTION_PROPOSED
    await db.update(supremeFindings).set({ status: 'ACTION_PROPOSED' }).where(eq(supremeFindings.id, findingId));

    void publishOperationalEvent({
        tenantId,
        eventType: 'supreme_playbook_executed',
        eventDomain: 'OPERATIONS',
        entityId: playbookId,
        payload: { findingId, actionIdsCount: actionIds.length }
    });

    return { playbookId, actionIds, findingStatus: 'ACTION_PROPOSED' };
}
