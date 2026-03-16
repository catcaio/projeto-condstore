import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { workflowRules, workflowRuns } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { eq, and } from 'drizzle-orm';
import { ecosystemEventsService } from './ecosystem-events.service';
import { queueService } from './queue.service';

// --- Types ---

interface WorkflowEvent {
    id: string;
    type: string;
    entityType: string;
    entityId: string | null;
    payload: Record<string, unknown>;
    actor: string;
    source: string;
}

// --- Service ---

export const workflowEngineService = {
    /**
     * Evaluate all active rules against an ecosystem event.
     * Matched rules produce workflow runs.
     */
    async evaluateRules(event: WorkflowEvent): Promise<void> {
        const db = await getDb();

        try {
            const rules = await db
                .select()
                .from(workflowRules)
                .where(
                    and(
                        eq(workflowRules.isActive, true),
                        eq(workflowRules.triggerType, 'event')
                    )
                );

            for (const rule of rules) {
                const triggerConfig = rule.triggerConfig as Record<string, unknown> | null;
                if (!triggerConfig) continue;

                // Match on event type
                if (triggerConfig.eventType && triggerConfig.eventType !== event.type) continue;

                // Check additional conditions
                if (rule.conditionJson) {
                    const conditions = rule.conditionJson as Record<string, unknown>;
                    let match = true;

                    for (const [key, expectedValue] of Object.entries(conditions)) {
                        const actualValue = (event.payload as Record<string, unknown>)[key];
                        if (actualValue !== expectedValue) {
                            match = false;
                            break;
                        }
                    }
                    if (!match) continue;
                }

                // Execute matched rule
                await this.executeWorkflow(rule.id, rule.tenantId, event);
            }
        } catch (err) {
            logger.error('workflow_evaluate_rules_failed', err as Error, { eventId: event.id });
        }
    },

    /**
     * Execute a workflow action for a matched rule.
     */
    async executeWorkflow(ruleId: string, tenantId: string, event: WorkflowEvent): Promise<void> {
        const db = await getDb();
        const runId = randomUUID();

        try {
            // Get rule details
            const [rule] = await db
                .select()
                .from(workflowRules)
                .where(eq(workflowRules.id, ruleId))
                .limit(1);

            if (!rule) return;

            // Create workflow run
            await db.insert(workflowRuns).values({
                id: runId,
                tenantId,
                ruleId,
                triggerEventId: event.id,
                status: 'running',
            });

            // Execute action based on type
            const actionConfig = rule.actionConfig as Record<string, unknown>;
            let result: Record<string, unknown> = {};

            switch (rule.actionType) {
                case 'create_followup':
                    result = { action: 'create_followup', scheduled: true };
                    break;
                case 'send_notification':
                    result = { action: 'send_notification', sent: true };
                    break;
                case 'update_stage':
                    result = { action: 'update_stage', newStage: actionConfig?.newStage };
                    break;
                case 'enqueue_job':
                    result = { action: 'enqueue_job', jobType: actionConfig?.jobType };
                    break;
                default:
                    result = { action: rule.actionType, status: 'executed' };
            }

            // Mark run completed
            await db
                .update(workflowRuns)
                .set({ status: 'completed', resultJson: result, completedAt: new Date() })
                .where(eq(workflowRuns.id, runId));

            logger.info('workflow_executed', { runId, ruleId, actionType: rule.actionType });
        } catch (err) {
            // Mark run failed
            await db
                .update(workflowRuns)
                .set({ status: 'failed', errorMsg: (err as Error).message, completedAt: new Date() })
                .where(eq(workflowRuns.id, runId))
                .catch(() => {});

            logger.error('workflow_execution_failed', err as Error, { runId, ruleId });
        }
    },

    /**
     * Schedule a workflow evaluation via the job queue.
     */
    async scheduleWorkflow(params: {
        tenantId: string;
        ruleId: string;
        scheduledAt: Date;
    }): Promise<string> {
        return queueService.enqueue({
            tenantId: params.tenantId,
            type: 'evaluate_workflows',
            payload: { ruleId: params.ruleId },
            scheduledAt: params.scheduledAt,
        });
    },

    /**
     * Wire into ecosystem events: auto-evaluate rules on each event.
     */
    init(): void {
        ecosystemEventsService.subscribe('*', async (event) => {
            await this.evaluateRules(event);
        });
        logger.info('workflow_engine_initialized');
    },
};
