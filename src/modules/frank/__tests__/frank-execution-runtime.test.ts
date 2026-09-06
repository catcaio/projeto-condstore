import { describe, expect, it, beforeEach, vi } from 'vitest';
import { frankExecutionRuntime } from '../frank-execution-runtime';
import { frankToolRegistry } from '../tools/frank-tool.registry';
import { FrankToolContract } from '../tools/frank-tool.contract';
import { frankExecutionStateService } from '../frank-execution-state.service';
import { z } from 'zod';

describe('FrankExecutionRuntime & Fail-Closed State Persistence (FRANK-001 - FRANK-005)', () => {
    beforeEach(() => {
        frankToolRegistry.registerDefaultTools();
    });

    describe('FRANK-001 — Fail-Closed Persistence & Lifecycle Guarantees', () => {
        it('ABSOLUTE GUARANTEE: Tool MUST NOT be executed if execution run creation fails', async () => {
            const toolExecuteSpy = vi.fn().mockResolvedValue({ orderId: 'ord_1', status: 'created', shipmentLink: '/ship/1' });

            const testContract: FrankToolContract<any, any> = {
                name: 'fail_closed_test_tool',
                description: 'Test fail closed on run persistence failure',
                inputSchema: z.object({ tenantId: z.string() }),
                outputSchema: z.any(),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: toolExecuteSpy,
            };
            frankToolRegistry.registerTool(testContract);

            // Mock createRun to simulate DB/persistence crash
            vi.spyOn(frankExecutionStateService, 'createRun').mockRejectedValueOnce(
                new Error('Database disk full: failed to persist execution run')
            );

            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_fail_run',
                requestId: 'req_fail_run',
                toolName: 'fail_closed_test_tool',
                input: { tenantId: 'tenant_fail_run' },
            });

            // Verification: Result is PERSISTENCE_FAILED and tool execute WAS NEVER CALLED
            expect(result.ok).toBe(false);
            expect(result.status).toBe('PERSISTENCE_FAILED');
            expect(result.error?.code).toBe('PERSISTENCE_FAILED');
            expect(result.error?.message).toContain('Fail-closed state persistence required');
            expect(toolExecuteSpy).not.toHaveBeenCalled();
        });

        it('ABSOLUTE GUARANTEE: Tool MUST NOT be executed if step creation fails', async () => {
            const toolExecuteSpy = vi.fn().mockResolvedValue({ orderId: 'ord_2', status: 'created', shipmentLink: '/ship/2' });

            const testContract: FrankToolContract<any, any> = {
                name: 'fail_closed_step_test_tool',
                description: 'Test fail closed on step persistence failure',
                inputSchema: z.object({ tenantId: z.string() }),
                outputSchema: z.any(),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: toolExecuteSpy,
            };
            frankToolRegistry.registerTool(testContract);

            // Mock addStep to simulate step checkpoint creation failure
            vi.spyOn(frankExecutionStateService, 'addStep').mockRejectedValueOnce(
                new Error('Database timeout: failed to persist step checkpoint')
            );

            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_fail_step',
                requestId: 'req_fail_step',
                toolName: 'fail_closed_step_test_tool',
                input: { tenantId: 'tenant_fail_step' },
            });

            // Verification: Result is PERSISTENCE_FAILED and tool execute WAS NEVER CALLED
            expect(result.ok).toBe(false);
            expect(result.status).toBe('PERSISTENCE_FAILED');
            expect(result.error?.code).toBe('PERSISTENCE_FAILED');
            expect(result.error?.message).toContain('step state persistence required');
            expect(toolExecuteSpy).not.toHaveBeenCalled();
        });

        it('should track full persistent lifecycle: Run -> Step RUNNING -> execute -> Step/Run COMPLETED', async () => {
            const mockContract: FrankToolContract<any, any> = {
                name: 'lifecycle_test_tool',
                description: 'Lifecycle tracking tool',
                inputSchema: z.object({ tenantId: z.string(), orderId: z.string() }),
                outputSchema: z.object({ orderId: z.string(), status: z.string() }),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ', 'QUERY'],
                sideEffects: ['NONE'],
                execute: async (input) => ({ orderId: input.orderId, status: 'DELIVERED' }),
            };

            frankToolRegistry.registerTool(mockContract);

            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_lifecycle_1',
                requestId: 'req_lifecycle_1',
                toolName: 'lifecycle_test_tool',
                input: { tenantId: 'tenant_lifecycle_1', orderId: 'ord_lifecycle_100' },
            });

            expect(result.ok).toBe(true);
            expect(result.status).toBe('SUCCESS');

            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_lifecycle_1', result.executionId);
            expect(state).not.toBeNull();
            expect(state?.run.status).toBe('COMPLETED');
            expect(state?.steps[0].status).toBe('COMPLETED');
            expect(state?.steps[0].outputPayload).toEqual({ orderId: 'ord_lifecycle_100', status: 'DELIVERED' });
        });

        it('should transition Step and Run to FAILED when tool execution throws an error', async () => {
            const failingContract: FrankToolContract<any, any> = {
                name: 'failing_exec_tool',
                description: 'Throws internal exception',
                inputSchema: z.object({ tenantId: z.string() }),
                outputSchema: z.any(),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async () => {
                    throw new Error('Upstream carrier API connection refused');
                },
            };

            frankToolRegistry.registerTool(failingContract);

            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_failing_1',
                requestId: 'req_failing_1',
                toolName: 'failing_exec_tool',
                input: { tenantId: 'tenant_failing_1' },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('EXECUTION_FAILED');
            expect(result.error?.message).toBe('Upstream carrier API connection refused');

            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_failing_1', result.executionId);
            expect(state?.run.status).toBe('FAILED');
            expect(state?.steps[0].status).toBe('FAILED');
            expect(state?.steps[0].errorMsg).toBe('Upstream carrier API connection refused');
        });

        it('should transition Step and Run to FAILED when schema validation fails', async () => {
            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_invalid_val',
                requestId: 'req_invalid_val',
                toolName: 'freight_calculation',
                input: {
                    tenantId: 'tenant_invalid_val',
                    productId: 'prod_1',
                    quantity: -100, // Invalid: negative quantity
                    destinationZip: '',
                },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('VALIDATION_FAILED');

            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_invalid_val', result.executionId);
            expect(state?.run.status).toBe('FAILED');
            expect(state?.steps[0].status).toBe('FAILED');
        });

        it('should pause execution with Step AWAITING_APPROVAL and Run PAUSED_HUMAN_APPROVAL when Human Gate token is missing', async () => {
            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_gate_pause',
                requestId: 'req_gate_pause',
                toolName: 'create_order_from_quote',
                input: {
                    tenantId: 'tenant_gate_pause',
                    simulationId: 'sim_pause',
                    customerId: 'cust_pause',
                    organizationId: 'org_pause',
                    items: [{ name: 'Item', quantity: 1, unitPrice: 10 }],
                },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('POLICY_BLOCKED');

            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_gate_pause', result.executionId);
            expect(state?.run.status).toBe('PAUSED_HUMAN_APPROVAL');
            expect(state?.steps[0].status).toBe('AWAITING_APPROVAL');
        });

        it('should resume paused step and complete execution when human operator approves', async () => {
            const mockCreateContract: FrankToolContract<any, any> = {
                name: 'resume_test_create_order_tool',
                description: 'Mock create order for resume test',
                inputSchema: z.object({
                    tenantId: z.string(),
                    simulationId: z.string(),
                    customerId: z.string(),
                    organizationId: z.string(),
                    items: z.array(z.any()),
                }),
                outputSchema: z.object({ orderId: z.string() }),
                isReadOnly: false,
                riskClass: 'CRITICAL',
                capabilities: ['WRITE', 'CREATE'],
                sideEffects: ['STATE_MUTATION', 'PERSISTENCE_WRITE'],
                execute: async () => ({ orderId: 'ord_resume_completed_99' }),
            };

            frankToolRegistry.registerTool(mockCreateContract);

            // Step 1: Request high-risk execution (pauses execution)
            const pausedResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_resume_1',
                requestId: 'req_resume_1',
                toolName: 'resume_test_create_order_tool',
                input: {
                    tenantId: 'tenant_resume_1',
                    simulationId: 'sim_resume',
                    customerId: 'cust_resume',
                    organizationId: 'org_resume',
                    items: [{ name: 'Item', quantity: 1, unitPrice: 10 }],
                },
            });

            expect(pausedResult.status).toBe('POLICY_BLOCKED');

            const pausedState = await frankExecutionStateService.getExecutionWithSteps('tenant_resume_1', pausedResult.executionId);
            const stepId = pausedState!.steps[0].id;

            // Step 2: Resume step via FrankExecutionStateService after operator approval
            const resumed = await frankExecutionStateService.resumeExecutionStep(
                'tenant_resume_1',
                pausedResult.executionId,
                stepId,
                'operator_user_777'
            );

            expect(resumed.run.status).toBe('RUNNING');
            expect(resumed.step.status).toBe('PENDING');
            expect(resumed.step.approvedBy).toBe('operator_user_777');

            // Step 3: Re-invoke with human approval token and allowHighRisk
            const finalResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_resume_1',
                requestId: 'req_resume_2',
                toolName: 'resume_test_create_order_tool',
                input: {
                    tenantId: 'tenant_resume_1',
                    simulationId: 'sim_resume',
                    customerId: 'cust_resume',
                    organizationId: 'org_resume',
                    items: [{ name: 'Item', quantity: 1, unitPrice: 10 }],
                },
                executionId: pausedResult.executionId,
                humanApprovalToken: 'hg_approved_token_777',
                allowHighRisk: true,
            });

            expect(finalResult.ok).toBe(true);
            expect(finalResult.status).toBe('SUCCESS');
            expect(finalResult.data).toEqual({ orderId: 'ord_resume_completed_99' });

            const finalState = await frankExecutionStateService.getExecutionWithSteps('tenant_resume_1', pausedResult.executionId);
            expect(finalState?.run.status).toBe('COMPLETED');
        });

        it('should enforce strict cross-tenant isolation and prevent executing or resuming step of another tenant', async () => {
            // Create run for Tenant Alpha
            const alphaRun = await frankExecutionStateService.createRun({
                tenantId: 'tenant_alpha_sec',
                title: 'Alpha Private Run',
            });

            const alphaStep = await frankExecutionStateService.addStep({
                executionRunId: alphaRun.id,
                tenantId: 'tenant_alpha_sec',
                stepNumber: 1,
                stepName: 'Alpha Step',
                actionType: 'create_order_from_quote',
                requiresHumanApproval: true,
            });

            // Tenant Beta attempts to retrieve/resume Alpha's execution run
            const betaState = await frankExecutionStateService.getExecutionWithSteps('tenant_beta_sec', alphaRun.executionId);
            expect(betaState).toBeNull(); // Tenant Beta gets NULL

            // Tenant Beta attempts to resume Tenant Alpha's step -> throws cross-tenant access error
            await expect(
                frankExecutionStateService.resumeExecutionStep('tenant_beta_sec', alphaRun.executionId, alphaStep.id, 'hacker_user')
            ).rejects.toThrow(/Cross-tenant access denied/);

            // Tenant Beta attempts to execute tool passing Tenant Alpha's executionId -> fails closed with PERSISTENCE_FAILED
            const mockReadContract: FrankToolContract<any, any> = {
                name: 'sec_test_read_tool',
                description: 'Read tool for security test',
                inputSchema: z.object({ tenantId: z.string(), orderId: z.string() }),
                outputSchema: z.any(),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async () => ({ orderId: 'ord_1' }),
            };
            frankToolRegistry.registerTool(mockReadContract);

            const crossTenantResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_beta_sec',
                requestId: 'req_hacker_1',
                toolName: 'sec_test_read_tool',
                input: { tenantId: 'tenant_beta_sec', orderId: 'ord_1' },
                executionId: alphaRun.executionId,
            });

            expect(crossTenantResult.ok).toBe(false);
            expect(crossTenantResult.status).toBe('PERSISTENCE_FAILED');
            expect(crossTenantResult.error?.message).toContain('Cross-tenant execution run access denied');
        });
    });
});
