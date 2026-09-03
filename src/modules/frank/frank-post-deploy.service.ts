import { logger } from '@/infra/logger';
import { frankExecutionStateService } from './frank-execution-state.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface PostDeployVerificationParams {
    tenantId: string;
    executionId: string;
    signalType: string;
    currentValue: number;
    expectedThreshold: number;
}

export interface PostDeployResult {
    resolved: boolean;
    currentValue: number;
    expectedThreshold: number;
    message: string;
}

export class FrankPostDeployService {
    /**
     * Verifies post-deploy metrics against pre-issue baseline thresholds.
     */
    async verifyPostDeploy(params: PostDeployVerificationParams): Promise<PostDeployResult> {
        logger.info('Frank Post-Deploy Verification running', {
            tenantId: params.tenantId,
            executionId: params.executionId,
            signalType: params.signalType
        });

        const resolved = params.currentValue <= params.expectedThreshold;
        const message = resolved
            ? `Post-deploy observation confirmed resolution for ${params.signalType}. Value: ${params.currentValue} <= Threshold: ${params.expectedThreshold}`
            : `Post-deploy observation alert: metric ${params.signalType} still degraded. Value: ${params.currentValue} > Threshold: ${params.expectedThreshold}`;

        // Register post-deploy verification event
        void publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: resolved ? 'frank_post_deploy_resolved' : 'frank_post_deploy_degraded',
            eventDomain: 'OPERATIONS',
            payload: {
                executionId: params.executionId,
                signalType: params.signalType,
                currentValue: params.currentValue,
                expectedThreshold: params.expectedThreshold,
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
                inputPayload: { resolved, currentValue: params.currentValue, expectedThreshold: params.expectedThreshold }
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
            currentValue: params.currentValue,
            expectedThreshold: params.expectedThreshold,
            message
        };
    }
}

export const frankPostDeployService = new FrankPostDeployService();
