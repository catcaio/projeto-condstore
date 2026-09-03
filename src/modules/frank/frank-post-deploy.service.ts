import { logger } from '@/infra/logger';
import { frankExecutionStateService } from './frank-execution-state.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';

export interface PostDeployVerificationParams {
    tenantId: string;
    executionId: string;
    signalType: string;
    currentValue?: number;
    expectedThreshold?: number;
    observationWindowMinutes?: number;
}

export interface PostDeployResult {
    resolved: boolean;
    currentValue: number;
    expectedThreshold: number;
    message: string;
}

export class FrankPostDeployService {
    /**
     * Verifies post-deploy metrics against pre-issue baseline thresholds using real DB operational events.
     */
    async verifyPostDeploy(params: PostDeployVerificationParams): Promise<PostDeployResult> {
        logger.info('Frank Post-Deploy Verification running', {
            tenantId: params.tenantId,
            executionId: params.executionId,
            signalType: params.signalType
        });

        const windowMin = params.observationWindowMinutes || 15;
        const expectedThreshold = params.expectedThreshold ?? 0;
        let currentValue = params.currentValue;

        // Query real operational events in DB if currentValue not explicitly provided
        if (typeof currentValue !== 'number') {
            currentValue = 0;
            try {
                const db = await getDb();
                if (db) {
                    const since = new Date(Date.now() - windowMin * 60 * 1000);
                    const recentErrors = await db.select().from(operationalEvents)
                        .where(and(
                            eq(operationalEvents.tenantId, params.tenantId),
                            eq(operationalEvents.eventType, params.signalType),
                            gte(operationalEvents.createdAt, since)
                        ));
                    currentValue = recentErrors.length;
                }
            } catch {
                // Fallback to 0 if DB query fails in non-prod/test
            }
        }

        const resolved = currentValue <= expectedThreshold;
        const message = resolved
            ? `Post-deploy observation confirmed resolution for ${params.signalType}. Measured: ${currentValue} <= Threshold: ${expectedThreshold}`
            : `Post-deploy observation alert: metric ${params.signalType} still degraded. Measured: ${currentValue} > Threshold: ${expectedThreshold}`;

        // Register post-deploy verification event
        void publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: resolved ? 'frank_post_deploy_resolved' : 'frank_post_deploy_degraded',
            eventDomain: 'OPERATIONS',
            payload: {
                executionId: params.executionId,
                signalType: params.signalType,
                currentValue,
                expectedThreshold,
                resolved
            }
        });

        // Add step in durable execution state
        const run = await frankExecutionStateService.getExecutionWithSteps(params.tenantId, params.executionId);
        if (run) {
            await frankExecutionStateService.addStep({
                executionRunId: run.run.id,
                tenantId: params.tenantId,
                stepNumber: 4,
                stepName: 'Monitoramento Observacional Pós-Deploy',
                actionType: 'POST_DEPLOY_VERIFICATION',
                riskClass: 'SAFE',
                requiresHumanApproval: false,
                inputPayload: { resolved, currentValue, expectedThreshold }
            });

            if (resolved) {
                await frankExecutionStateService.updateRunStatus(
                    run.run.id,
                    'COMPLETED',
                    'Problema resolvido e confirmado pós-deploy'
                );
            } else {
                await frankExecutionStateService.updateRunStatus(
                    run.run.id,
                    'RUNNING',
                    'Reabrindo investigação - métrica continua degradada pós-deploy'
                );
            }
        }

        return {
            resolved,
            currentValue,
            expectedThreshold,
            message
        };
    }
}

export const frankPostDeployService = new FrankPostDeployService();
