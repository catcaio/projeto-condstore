import { describe, it, expect, vi } from 'vitest';
import { frankCockpitChatService, StreamEvent } from '../frank-cockpit-chat.service';
import { frankExecutionStateService } from '../frank-execution-state.service';
import { runTool } from '../tools/tool-runner';

describe('Frank Cockpit Chat Service & Human Gate Security', () => {
    const tenantA = 'tenant_cockpit_alpha';
    const tenantB = 'tenant_cockpit_beta';
    const userA = 'user_operator_authenticated_real_id';

    it('should process chat message and gather real evidence for authorized tenant', async () => {
        const events: StreamEvent[] = [];
        const result = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: 'Frank, qual é o estado do sistema?',
                context: { module: 'cockpit' },
            },
            (event) => events.push(event)
        );

        expect(result.executionId).toBeDefined();
        expect(result.text).toContain('Tenant');

        const statusEvents = events.filter(e => e.type === 'status');
        expect(statusEvents.length).toBeGreaterThan(0);

        const evidenceEvents = events.filter(e => e.type === 'evidence');
        expect(evidenceEvents.length).toBeGreaterThan(0);

        const chunkEvents = events.filter(e => e.type === 'chunk');
        expect(chunkEvents.length).toBeGreaterThan(0);

        const doneEvents = events.filter(e => e.type === 'done');
        expect(doneEvents.length).toBe(1);
    });

    it('should trigger Human Gate approval for high-risk order creation action', async () => {
        const events: StreamEvent[] = [];
        const result = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: 'Frank, quero criar pedido para a cotação aceita',
                context: { module: 'pedidos' },
            },
            (event) => events.push(event)
        );

        const humanGateEvents = events.filter(e => e.type === 'human_gate_required');
        expect(humanGateEvents.length).toBe(1);
        expect(humanGateEvents[0].action).toBe('create_order_from_quote');
        expect(humanGateEvents[0].stepId).toBeDefined();

        // Verify execution run state is PAUSED_HUMAN_APPROVAL
        const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantA, result.executionId);
        expect(runDetails).toBeDefined();
        expect(runDetails?.run.status).toBe('PAUSED_HUMAN_APPROVAL');
        expect(runDetails?.steps[0].status).toBe('AWAITING_APPROVAL');
    });

    it('should ignore client-spoofed approvedBy and derive approver strictly from authenticated session userId', async () => {
        // Step 1: Trigger Human Gate
        const events1: StreamEvent[] = [];
        const res1 = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA, // Authenticated user ID
                message: 'Frank, criar pedido agora',
                context: { module: 'pedidos' },
            },
            (event) => events1.push(event)
        );

        const gateEvent = events1.find(e => e.type === 'human_gate_required');
        expect(gateEvent?.stepId).toBeDefined();

        // Step 2: Attempt spoofing approvedBy in body
        const events2: StreamEvent[] = [];
        await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA, // Authenticated session
                message: '',
                executionId: res1.executionId,
                humanApproval: {
                    stepId: gateEvent!.stepId!,
                    approved: true,
                    approvedBy: 'hacker_fake_user_id', // Spoofed payload that MUST be ignored
                },
            },
            (event) => events2.push(event)
        );

        const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantA, res1.executionId);
        expect(runDetails?.steps[0].approvedBy).toBe(userA); // Verified: derived from session userId, NOT spoofed payload!
        expect(runDetails?.steps[0].approvedBy).not.toBe('hacker_fake_user_id');
    });

    it('should complete step as COMPLETED when Human Gate is approved and tool executes successfully', async () => {
        // Step 1: Trigger Human Gate
        const events1: StreamEvent[] = [];
        const res1 = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: 'Frank, criar pedido agora',
                context: { module: 'pedidos' },
            },
            (event) => events1.push(event)
        );

        const gateEvent = events1.find(e => e.type === 'human_gate_required');

        // Mock tool execution to simulate successful tool output
        const spyRunTool = vi.spyOn(await import('../tools/tool-runner'), 'runTool');
        spyRunTool.mockResolvedValueOnce({
            ok: true,
            action: 'create_order_from_quote',
            riskLevel: 'HIGH_RISK',
            requestId: res1.executionId,
            durationMs: 15,
            data: { orderId: 'ord_success_123', status: 'CONFIRMED' } as any,
            error: null,
        });

        // Step 2: Approve Human Gate
        const events2: StreamEvent[] = [];
        await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: '',
                executionId: res1.executionId,
                humanApproval: {
                    stepId: gateEvent!.stepId!,
                    approved: true,
                },
            },
            (event) => events2.push(event)
        );

        const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantA, res1.executionId);
        expect(runDetails?.steps[0].status).toBe('COMPLETED');
        expect(runDetails?.steps[0].outputPayload).toEqual({ orderId: 'ord_success_123', status: 'CONFIRMED' });

        spyRunTool.mockRestore();
    });

    it('should complete step as FAILED when Human Gate is approved but tool execution fails legitimately', async () => {
        // Step 1: Trigger Human Gate
        const events1: StreamEvent[] = [];
        const res1 = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: 'Frank, criar pedido agora',
                context: { module: 'pedidos' },
            },
            (event) => events1.push(event)
        );

        const gateEvent = events1.find(e => e.type === 'human_gate_required');

        // Step 2: Approve Human Gate with legitimate tool failure
        const events2: StreamEvent[] = [];
        await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: '',
                executionId: res1.executionId,
                humanApproval: {
                    stepId: gateEvent!.stepId!,
                    approved: true,
                },
            },
            (event) => events2.push(event)
        );

        const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantA, res1.executionId);
        // Human approval succeeded, but tool failed due to missing DB/quote -> step status is FAILED
        expect(runDetails?.steps[0].approvedBy).toBe(userA);
        expect(runDetails?.steps[0].status).toBe('FAILED');
        expect(runDetails?.steps[0].errorMsg).toBeDefined();
    });

    it('should enforce multi-tenant isolation at the tool runner level and block cross-tenant queries', async () => {
        // Attempting tool call for tenantB using tenantA context
        const toolResult = await runTool(
            'get_order_status',
            { tenantId: tenantB, orderId: 'ord_tenant_b_123' },
            { tenantId: tenantA, requestId: 'req_test_cross_tenant' }
        );

        expect(toolResult.ok).toBe(false);
        expect(toolResult.error?.code).toBe('POLICY_BLOCKED');
        expect(toolResult.error?.details?.reason).toBe('tenant_mismatch');
    });
});
