import { describe, expect, it, beforeEach, vi } from 'vitest';
import { frankExecutionRuntime } from '../frank-execution-runtime';
import { frankToolRegistry, FrankToolNotFoundError } from '../tools/frank-tool.registry';
import { FrankToolContract } from '../tools/frank-tool.contract';
import { frankExecutionStateService } from '../frank-execution-state.service';
import { z } from 'zod';

describe('FrankExecutionRuntime & Tool Governance (FRANK-001 - FRANK-005)', () => {
    beforeEach(() => {
        frankToolRegistry.registerDefaultTools();
    });

    describe('FRANK-001 — Agent Execution Runtime Lifecycle', () => {
        it('should execute a valid tool, track step checkpoint, and return structured result', async () => {
            const mockContract: FrankToolContract<any, any> = {
                name: 'test_order_status_tool',
                description: 'Test order status',
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
                tenantId: 'tenant_runtime_1',
                requestId: 'req_runtime_1',
                toolName: 'test_order_status_tool',
                input: {
                    tenantId: 'tenant_runtime_1',
                    orderId: 'ord_123',
                },
            });

            expect(result.ok).toBe(true);
            expect(result.action).toBe('test_order_status_tool');
            expect(result.toolName).toBe('test_order_status_tool');
            expect(result.riskLevel).toBe('LOW_RISK');
            expect(result.error).toBeNull();
            expect(result.executionId).toBeDefined();
            expect(result.stepId).toBeDefined();

            // Verify persistent execution state
            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_runtime_1', result.executionId);
            expect(state).not.toBeNull();
            expect(state?.steps.length).toBeGreaterThan(0);
            expect(state?.steps[0].status).toBe('COMPLETED');
        });

        it('should allow cancelling active execution run', async () => {
            const run = await frankExecutionStateService.createRun({
                tenantId: 'tenant_runtime_cancel',
                title: 'Run to be cancelled',
            });

            await frankExecutionStateService.cancelExecutionRun('tenant_runtime_cancel', run.id, 'Cancelled by operator test');

            const state = await frankExecutionStateService.getExecutionWithSteps('tenant_runtime_cancel', run.id);
            expect(state?.run.status).toBe('CANCELLED');
            expect(state?.run.errorMsg).toBe('Cancelled by operator test');
        });
    });

    describe('FRANK-002 — Tool Contract & Central Registry', () => {
        it('should resolve registered tool contract and fail explicitly on missing tool', async () => {
            expect(frankToolRegistry.hasTool('get_order_status')).toBe(true);

            const missingResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_reg_1',
                requestId: 'req_reg_1',
                toolName: 'non_existent_tool_123',
                input: {},
            });

            expect(missingResult.ok).toBe(false);
            expect(missingResult.status).toBe('EXECUTION_FAILED');
            expect(missingResult.error?.code).toBe('TOOL_NOT_FOUND');
            expect(missingResult.error?.message).toContain('non_existent_tool_123');
        });

        it('should enforce contract invariant checks when registering invalid contracts', () => {
            const invalidContract = {
                name: 'invalid_read_only_tool',
                description: 'Claims read-only but produces side effects',
                inputSchema: z.object({}),
                outputSchema: z.object({}),
                isReadOnly: true,
                riskClass: 'SAFE' as const,
                capabilities: ['READ' as const, 'WRITE' as const], // Invalid: WRITE capability on read-only
                sideEffects: ['PERSISTENCE_WRITE' as const], // Invalid: PERSISTENCE_WRITE on read-only
                execute: async () => ({}),
            };

            expect(() => frankToolRegistry.registerTool(invalidContract as any)).toThrow(
                /is declared as isReadOnly=true/
            );
        });
    });

    describe('FRANK-003 — Strict Input Validation & Tenant Spoofing Prevention', () => {
        it('should reject payload when input schema validation fails', async () => {
            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_val_1',
                requestId: 'req_val_1',
                toolName: 'freight_calculation',
                input: {
                    tenantId: 'tenant_val_1',
                    productId: 'prod_1',
                    quantity: -5, // Invalid: quantity must be positive
                    destinationZip: '',
                },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('VALIDATION_FAILED');
            expect(result.error?.code).toBe('INVALID_INPUT_SCHEMA');
            expect(result.error?.message).toContain('quantity');
        });

        it('should block tenant spoofing when payload tenantId differs from context tenantId', async () => {
            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_context_alpha',
                requestId: 'req_spoof_1',
                toolName: 'get_order_status',
                input: {
                    tenantId: 'tenant_spoofed_beta', // Tenant mismatch attempt
                    orderId: 'ord_secret_999',
                },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('POLICY_BLOCKED');
            expect(result.error?.code).toBe('POLICY_BLOCKED');
            expect(result.error?.details).toEqual({ reason: 'tenant_mismatch' });
        });
    });

    describe('FRANK-004 — Tool Output Verification & Evidence Integrity', () => {
        it('should reject output when tool returns data that violates output schema', async () => {
            const badOutputContract: FrankToolContract<any, any> = {
                name: 'bad_output_tool',
                description: 'Returns data breaking output schema',
                inputSchema: z.object({ tenantId: z.string() }),
                outputSchema: z.object({ requiredField: z.string() }),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async () => ({ requiredField: 12345 }), // Wrong type: number instead of string
            };

            frankToolRegistry.registerTool(badOutputContract);

            const result = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_out_1',
                requestId: 'req_out_1',
                toolName: 'bad_output_tool',
                input: { tenantId: 'tenant_out_1' },
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe('SEMANTIC_INVALID');
            expect(result.error?.code).toBe('INVALID_OUTPUT_SCHEMA');
            expect(result.evidence).toBeNull(); // Unverified output MUST NOT be persisted as evidence
        });

        it('should classify null or empty array output as EMPTY_RESULT', async () => {
            const emptyContract: FrankToolContract<any, any> = {
                name: 'empty_orders_tool',
                description: 'Returns empty list',
                inputSchema: z.object({ tenantId: z.string() }),
                outputSchema: z.array(z.any()),
                isReadOnly: true,
                riskClass: 'SAFE',
                capabilities: ['READ'],
                sideEffects: ['NONE'],
                execute: async () => [],
            };

            frankToolRegistry.registerTool(emptyContract);

            const emptyResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_out_empty',
                requestId: 'req_out_empty',
                toolName: 'empty_orders_tool',
                input: { tenantId: 'tenant_out_empty' },
            });

            expect(emptyResult.ok).toBe(true);
            expect(emptyResult.status).toBe('EMPTY_RESULT');
            expect(emptyResult.data).toEqual([]);
        });
    });

    describe('FRANK-005 — Capability & Side-Effect Classification', () => {
        it('should expose capability, side-effect, and risk classification metadata', async () => {
            const contract = frankToolRegistry.getTool('create_order_from_quote');
            expect(contract).toBeDefined();
            expect(contract?.isReadOnly).toBe(false);
            expect(contract?.riskClass).toBe('CRITICAL');
            expect(contract?.capabilities).toEqual(['WRITE', 'CREATE', 'FINANCIAL']);
            expect(contract?.sideEffects).toEqual(['STATE_MUTATION', 'PERSISTENCE_WRITE']);

            const readContract = frankToolRegistry.getTool('get_customer_context');
            expect(readContract?.isReadOnly).toBe(true);
            expect(readContract?.riskClass).toBe('SAFE');
            expect(readContract?.capabilities).toEqual(['READ', 'QUERY', 'SEARCH']);
            expect(readContract?.sideEffects).toEqual(['NONE']);
        });

        it('should require human approval token for CRITICAL risk class tools', async () => {
            const mockCreateContract: FrankToolContract<any, any> = {
                name: 'mock_create_order_tool',
                description: 'Mock order creation',
                inputSchema: z.object({ tenantId: z.string(), simulationId: z.string() }),
                outputSchema: z.object({ orderId: z.string() }),
                isReadOnly: false,
                riskClass: 'CRITICAL',
                capabilities: ['WRITE', 'CREATE'],
                sideEffects: ['STATE_MUTATION', 'PERSISTENCE_WRITE'],
                execute: async () => ({ orderId: 'ord_mock_1' }),
            };

            // Register temporary mock tool with same risk class
            frankToolRegistry.registerTool(mockCreateContract);

            const blockedResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_gate_1',
                requestId: 'req_gate_1',
                toolName: 'mock_create_order_tool',
                input: {
                    tenantId: 'tenant_gate_1',
                    simulationId: 'sim_1',
                },
            });

            expect(blockedResult.ok).toBe(false);
            expect(blockedResult.status).toBe('POLICY_BLOCKED');
            expect(blockedResult.error?.details?.reason).toBe('missing_human_approval_token');

            // With human approval token and allowHighRisk
            const allowedResult = await frankExecutionRuntime.executeTool({
                tenantId: 'tenant_gate_1',
                requestId: 'req_gate_2',
                toolName: 'mock_create_order_tool',
                input: {
                    tenantId: 'tenant_gate_1',
                    simulationId: 'sim_1',
                },
                humanApprovalToken: 'hg_valid_token_123',
                allowHighRisk: true,
            });

            expect(allowedResult.ok).toBe(true);
            expect(allowedResult.status).toBe('SUCCESS');
            expect(allowedResult.data).toEqual({ orderId: 'ord_mock_1' });
        });
    });
});
