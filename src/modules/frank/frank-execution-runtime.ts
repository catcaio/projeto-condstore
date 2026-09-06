import { logger } from '@/infra/logger';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';
import { frankExecutionStateService, ExecutionStepStatus, RiskClass } from './frank-execution-state.service';
import { frankToolRegistry, FrankToolNotFoundError } from './tools/frank-tool.registry';
import { ToolExecutionContext, FrankToolRiskClass } from './tools/frank-tool.contract';
import { evaluateFrankToolPolicy, FrankToolRiskLevel } from './tools/tool-policy';

// Importing tool index guarantees all canonical contracts are registered
import './tools/index';

export type ToolExecutionStatus =
    | 'SUCCESS'
    | 'SEMANTIC_INVALID'
    | 'EMPTY_RESULT'
    | 'PARTIAL_RESULT'
    | 'OPERATIONAL_ERROR'
    | 'POLICY_BLOCKED'
    | 'VALIDATION_FAILED'
    | 'PERSISTENCE_FAILED'
    | 'EXECUTION_FAILED';

export interface StructuredToolExecutionResult<TData = unknown> {
    ok: boolean;
    status: ToolExecutionStatus;
    action: string;
    toolName: string;
    executionId: string;
    stepId?: string;
    riskLevel: FrankToolRiskLevel;
    durationMs: number;
    data: TData | null;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    } | null;
    evidence: Record<string, unknown> | null;
    metadata: Record<string, unknown>;
}

export interface FrankRuntimeExecutionParams {
    tenantId: string;
    requestId: string;
    toolName: string;
    input: unknown;
    executionId?: string;
    userId?: string;
    allowHighRisk?: boolean;
    humanApprovalToken?: string;
}

function mapRiskClassToRiskLevel(riskClass: FrankToolRiskClass): FrankToolRiskLevel {
    switch (riskClass) {
        case 'SAFE':
            return 'LOW_RISK';
        case 'GUARDED':
            return 'MEDIUM_RISK';
        case 'CRITICAL':
            return 'HIGH_RISK';
        default:
            return 'LOW_RISK';
    }
}

function mapRiskClassToStateRisk(riskClass: FrankToolRiskClass): RiskClass {
    switch (riskClass) {
        case 'SAFE':
            return 'SAFE';
        case 'GUARDED':
            return 'GUARDED';
        case 'CRITICAL':
            return 'CRITICAL';
        default:
            return 'SAFE';
    }
}

function sanitizeTelemetryInput(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
        return input;
    }

    const redactedKeys = new Set(['customerId', 'organizationId', 'phone']);
    const source = input as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
        sanitized[key] = redactedKeys.has(key) ? '[REDACTED]' : value;
    }

    return sanitized;
}

export class FrankExecutionRuntime {
    /**
     * Canonical entrypoint for running any tool/action within the Frank Execution Runtime.
     * Fail-closed persistence guarantee: Execution without persistent state is impossible.
     * Enforces: Identity -> Run State -> Step State -> Contract Lookup -> Strict Input Validation -> Policy -> Tool Execution -> Output Verification -> Evidence -> State Persistence.
     */
    async executeTool<TInput = unknown, TOutput = unknown>(
        params: FrankRuntimeExecutionParams
    ): Promise<StructuredToolExecutionResult<TOutput>> {
        const startedAt = Date.now();
        const { tenantId, requestId, toolName, input, userId, allowHighRisk, humanApprovalToken } = params;

        // 1. Resolve or initialize Execution Run (Fail-closed)
        let runId: string;
        let executionId: string;

        try {
            if (params.executionId) {
                const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantId, params.executionId);
                if (!runDetails || runDetails.run.tenantId !== tenantId) {
                    throw new Error(`Cross-tenant execution run access denied or run [${params.executionId}] not found for tenant [${tenantId}]`);
                }
                executionId = runDetails.run.executionId;
                runId = runDetails.run.id;
            } else {
                const newRun = await frankExecutionStateService.createRun({
                    tenantId,
                    title: `Frank Execution: ${toolName}`,
                    triggerSource: 'SYSTEM',
                    autonomyLevel: 'EXECUTE_GUARDED',
                    contextJson: { toolName, requestId },
                });
                runId = newRun.id;
                executionId = newRun.executionId;
            }
        } catch (err) {
            const durationMs = Date.now() - startedAt;
            const message = err instanceof Error ? err.message : 'Failed to establish persistent execution run';
            logger.error('frank_runtime_persistence_run_failed', err as Error, { tenantId, toolName, requestId });

            return {
                ok: false,
                status: 'PERSISTENCE_FAILED',
                action: toolName,
                toolName,
                executionId: params.executionId || requestId,
                riskLevel: 'LOW_RISK',
                durationMs,
                data: null,
                error: {
                    code: 'PERSISTENCE_FAILED',
                    message: `Execution aborted: Fail-closed state persistence required [${message}]`,
                },
                evidence: null,
                metadata: { tenantId, requestId },
            };
        }

        // 2. Resolve Tool Contract from Canonical Registry (FRANK-002)
        const toolContract = frankToolRegistry.getTool<TInput, TOutput>(toolName);
        if (!toolContract) {
            const durationMs = Date.now() - startedAt;
            const notFoundErr = new FrankToolNotFoundError(toolName);

            logger.error('frank_runtime_tool_not_found', notFoundErr, {
                tenantId,
                executionId,
                toolName,
            });

            await frankExecutionStateService.updateRunStatus(
                runId,
                'FAILED',
                undefined,
                undefined,
                notFoundErr.message
            ).catch(() => {});

            return {
                ok: false,
                status: 'EXECUTION_FAILED',
                action: toolName,
                toolName,
                executionId,
                riskLevel: 'LOW_RISK',
                durationMs,
                data: null,
                error: {
                    code: 'TOOL_NOT_FOUND',
                    message: notFoundErr.message,
                },
                evidence: null,
                metadata: { tenantId, requestId },
            };
        }

        const riskLevel = mapRiskClassToRiskLevel(toolContract.riskClass);
        const stateRisk = mapRiskClassToStateRisk(toolContract.riskClass);

        // 3. Create persistent Execution Step checkpoint (Fail-closed)
        let stepId: string;
        try {
            const step = await frankExecutionStateService.addStep({
                executionRunId: runId,
                tenantId,
                stepNumber: Date.now(),
                stepName: `Execute ${toolName}`,
                actionType: toolName,
                riskClass: stateRisk,
                requiresHumanApproval: toolContract.riskClass === 'CRITICAL' && !humanApprovalToken,
                inputPayload: sanitizeTelemetryInput(input) as Record<string, unknown>,
            });
            stepId = step.id;
            await frankExecutionStateService.updateStepCheckpoint(tenantId, stepId, 'RUNNING');
        } catch (stepErr) {
            const durationMs = Date.now() - startedAt;
            const message = stepErr instanceof Error ? stepErr.message : 'Failed to persist step state';
            logger.error('frank_runtime_persistence_step_failed', stepErr as Error, { tenantId, toolName, runId });

            await frankExecutionStateService.updateRunStatus(
                runId,
                'FAILED',
                undefined,
                undefined,
                `Step persistence failed: ${message}`
            ).catch(() => {});

            return {
                ok: false,
                status: 'PERSISTENCE_FAILED',
                action: toolName,
                toolName,
                executionId,
                riskLevel,
                durationMs,
                data: null,
                error: {
                    code: 'PERSISTENCE_FAILED',
                    message: `Execution aborted: Fail-closed step state persistence required [${message}]`,
                },
                evidence: null,
                metadata: { tenantId, requestId, runId },
            };
        }

        // 4. Strict Input Schema Validation & Tenant Spoofing Check (FRANK-003)
        if (input && typeof input === 'object') {
            const rawTenant = (input as { tenantId?: unknown }).tenantId;
            if (typeof rawTenant === 'string' && rawTenant.length > 0 && rawTenant !== tenantId) {
                const durationMs = Date.now() - startedAt;
                logger.warn('frank_runtime_tenant_spoofing_blocked', {
                    contextTenantId: tenantId,
                    payloadTenantId: rawTenant,
                    toolName,
                    executionId,
                });

                await frankExecutionStateService.updateStepCheckpoint(
                    tenantId,
                    stepId,
                    'FAILED',
                    undefined,
                    undefined,
                    `Tenant spoofing attempt blocked: payload tenant [${rawTenant}] does not match context tenant [${tenantId}]`
                );

                await frankExecutionStateService.updateRunStatus(
                    runId,
                    'FAILED',
                    undefined,
                    undefined,
                    'Tenant spoofing attempt blocked'
                );

                return {
                    ok: false,
                    status: 'POLICY_BLOCKED',
                    action: toolName,
                    toolName,
                    executionId,
                    stepId,
                    riskLevel,
                    durationMs,
                    data: null,
                    error: {
                        code: 'POLICY_BLOCKED',
                        message: 'Tool execution blocked by policy layer.',
                        details: { reason: 'tenant_mismatch' },
                    },
                    evidence: null,
                    metadata: { tenantId, requestId },
                };
            }
        }

        const parseResult = toolContract.inputSchema.safeParse(input);
        if (!parseResult.success) {
            const durationMs = Date.now() - startedAt;
            const issues = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');

            logger.warn('frank_runtime_input_validation_failed', {
                tenantId,
                executionId,
                toolName,
                issues,
            });

            await frankExecutionStateService.updateStepCheckpoint(
                tenantId,
                stepId,
                'FAILED',
                undefined,
                undefined,
                `Input schema validation failed: ${issues}`
            );

            await frankExecutionStateService.updateRunStatus(
                runId,
                'FAILED',
                undefined,
                undefined,
                `Input validation failed: ${issues}`
            );

            return {
                ok: false,
                status: 'VALIDATION_FAILED',
                action: toolName,
                toolName,
                executionId,
                stepId,
                riskLevel,
                durationMs,
                data: null,
                error: {
                    code: 'INVALID_INPUT_SCHEMA',
                    message: `Tool input validation failed: ${issues}`,
                    details: { issues: parseResult.error.issues },
                },
                evidence: null,
                metadata: { tenantId, requestId },
            };
        }

        const validatedInput = parseResult.data;

        // 5. Policy & Human Gate Engine Check
        const context: ToolExecutionContext = {
            tenantId,
            requestId: executionId,
            userId,
            allowHighRisk,
            humanApprovalToken,
        };

        const decision = evaluateFrankToolPolicy(toolName as any, context, {
            targetTenantId: (validatedInput as any)?.tenantId ?? tenantId,
        });

        if (!decision.allowed) {
            const durationMs = Date.now() - startedAt;
            const blockedResult: StructuredToolExecutionResult<TOutput> = {
                ok: false,
                status: 'POLICY_BLOCKED',
                action: toolName,
                toolName,
                executionId,
                stepId,
                riskLevel: decision.riskLevel,
                durationMs,
                data: null,
                error: {
                    code: 'POLICY_BLOCKED',
                    message: 'Tool execution blocked by security policy layer.',
                    details: { reason: decision.reason },
                },
                evidence: null,
                metadata: { tenantId, requestId },
            };

            const stepStatus: ExecutionStepStatus = decision.reason === 'missing_human_approval_token'
                ? 'AWAITING_APPROVAL'
                : 'FAILED';

            await frankExecutionStateService.updateStepCheckpoint(
                tenantId,
                stepId,
                stepStatus,
                undefined,
                undefined,
                `Policy blocked execution: ${decision.reason}`
            );

            if (decision.reason === 'missing_human_approval_token') {
                await frankExecutionStateService.updateRunStatus(
                    runId,
                    'PAUSED_HUMAN_APPROVAL',
                    `Aguardando aprovação do operador para ${toolName}`
                );
            } else {
                await frankExecutionStateService.updateRunStatus(
                    runId,
                    'FAILED',
                    undefined,
                    undefined,
                    `Policy blocked execution: ${decision.reason}`
                );
            }

            logger.warn('frank_runtime_policy_blocked', {
                tenantId,
                executionId,
                toolName,
                reason: decision.reason,
            });

            if (decision.riskLevel === 'HIGH_RISK') {
                await adminAuditLogRepository.log({
                    tenantId,
                    userId: userId || 'frank-agent',
                    action: `frank_tool_${toolName}`,
                    metadata: {
                        riskLevel: decision.riskLevel,
                        approved: false,
                        blocked: true,
                        reason: decision.reason ?? null,
                        tokenReference: humanApprovalToken ?? null,
                    }
                }).catch(e => logger.error('Failed to write admin audit log', e as Error));
            }

            return blockedResult;
        }

        // 6. Tool Execution
        try {
            const rawOutput = await toolContract.execute(validatedInput, context);
            const durationMs = Date.now() - startedAt;

            // 7. Tool Output Schema Verification & Semantic Validation (FRANK-004)
            const outputParseResult = toolContract.outputSchema.safeParse(rawOutput);
            if (!outputParseResult.success) {
                const issues = outputParseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
                logger.warn('frank_runtime_output_verification_failed', {
                    tenantId,
                    executionId,
                    toolName,
                    issues,
                });

                await frankExecutionStateService.updateStepCheckpoint(
                    tenantId,
                    stepId,
                    'FAILED',
                    undefined,
                    undefined,
                    `Output verification failed: ${issues}`
                );

                await frankExecutionStateService.updateRunStatus(
                    runId,
                    'FAILED',
                    undefined,
                    undefined,
                    `Output verification failed: ${issues}`
                );

                return {
                    ok: false,
                    status: 'SEMANTIC_INVALID',
                    action: toolName,
                    toolName,
                    executionId,
                    stepId,
                    riskLevel,
                    durationMs,
                    data: null,
                    error: {
                        code: 'INVALID_OUTPUT_SCHEMA',
                        message: `Tool output failed schema verification: ${issues}`,
                        details: { issues: outputParseResult.error.issues },
                    },
                    evidence: null, // Unverified output MUST NOT be persisted as reliable evidence
                    metadata: { tenantId, requestId },
                };
            }

            const verifiedOutput = outputParseResult.data;

            // Semantic status classification
            let executionStatus: ToolExecutionStatus = 'SUCCESS';
            if (verifiedOutput === null || verifiedOutput === undefined) {
                executionStatus = 'EMPTY_RESULT';
            } else if (Array.isArray(verifiedOutput) && verifiedOutput.length === 0) {
                executionStatus = 'EMPTY_RESULT';
            }

            // Structured Evidence Generation
            const evidence = {
                toolName,
                executionId,
                stepId,
                timestamp: new Date().toISOString(),
                capabilities: toolContract.capabilities,
                sideEffects: toolContract.sideEffects,
                isReadOnly: toolContract.isReadOnly,
                resultType: executionStatus,
                payloadSummary: sanitizeTelemetryInput(verifiedOutput),
            };

            // Update step checkpoint with verified output
            await frankExecutionStateService.updateStepCheckpoint(
                tenantId,
                stepId,
                'COMPLETED',
                verifiedOutput as Record<string, unknown>,
                { evidence }
            );

            await frankExecutionStateService.updateRunStatus(
                runId,
                'COMPLETED',
                `Executed ${toolName}`,
                { verifiedOutput }
            );

            logger.info('frank_runtime_execution_completed', {
                tenantId,
                executionId,
                toolName,
                durationMs,
                status: executionStatus,
            });

            if (decision.riskLevel === 'HIGH_RISK') {
                await adminAuditLogRepository.log({
                    tenantId,
                    userId: userId || 'frank-agent',
                    action: `frank_tool_${toolName}`,
                    metadata: {
                        riskLevel: decision.riskLevel,
                        approved: true,
                        blocked: false,
                        reason: null,
                        tokenReference: humanApprovalToken ?? null,
                    }
                }).catch(e => logger.error('Failed to write admin audit log', e as Error));
            }

            return {
                ok: true,
                status: executionStatus,
                action: toolName,
                toolName,
                executionId,
                stepId,
                riskLevel,
                durationMs,
                data: verifiedOutput,
                error: null,
                evidence,
                metadata: {
                    tenantId,
                    requestId,
                    capabilities: toolContract.capabilities,
                    sideEffects: toolContract.sideEffects,
                },
            };

        } catch (error) {
            const durationMs = Date.now() - startedAt;
            const message = error instanceof Error ? error.message : 'Unknown tool execution error';

            logger.error('frank_runtime_execution_failed', error as Error, {
                tenantId,
                executionId,
                toolName,
                durationMs,
            });

            await frankExecutionStateService.updateStepCheckpoint(
                tenantId,
                stepId,
                'FAILED',
                undefined,
                undefined,
                message
            );

            await frankExecutionStateService.updateRunStatus(
                runId,
                'FAILED',
                undefined,
                undefined,
                message
            );

            return {
                ok: false,
                status: 'EXECUTION_FAILED',
                action: toolName,
                toolName,
                executionId,
                stepId,
                riskLevel,
                durationMs,
                data: null,
                error: {
                    code: 'TOOL_EXECUTION_FAILED',
                    message,
                },
                evidence: null,
                metadata: { tenantId, requestId },
            };
        }
    }
}

export const frankExecutionRuntime = new FrankExecutionRuntime();
