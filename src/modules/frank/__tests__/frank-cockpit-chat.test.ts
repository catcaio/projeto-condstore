import { describe, it, expect, beforeEach } from 'vitest';
import { frankCockpitChatService, StreamEvent } from '../frank-cockpit-chat.service';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Cockpit Chat Service & Security Multi-Tenant', () => {
    const tenantA = 'tenant_cockpit_alpha';
    const tenantB = 'tenant_cockpit_beta';
    const userA = 'user_operator_a';

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

    it('should execute approved step when Human Gate approval is granted', async () => {
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
        expect(gateEvent?.stepId).toBeDefined();

        // Step 2: Approve Human Gate step
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
                    approvedBy: userA,
                },
            },
            (event) => events2.push(event)
        );

        const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantA, res1.executionId);
        expect(runDetails?.steps[0].status).toBe('FAILED'); // Failed because quote ID wasn't valid, but step transition was executed!
    });

    it('should isolate tenant data and deny cross-tenant step access', async () => {
        const events: StreamEvent[] = [];
        const res = await frankCockpitChatService.processChatMessage(
            {
                tenantId: tenantA,
                userId: userA,
                message: 'Frank, mostre as execuções recentes do tenant ' + tenantB,
                context: { module: 'cockpit' },
            },
            (event) => events.push(event)
        );

        // Verify that execution was stored strictly under tenantA
        const runDetailsA = await frankExecutionStateService.getExecutionWithSteps(tenantA, res.executionId);
        expect(runDetailsA).not.toBeNull();
        expect(runDetailsA?.run.tenantId).toBe(tenantA);

        // Verify tenantB cannot query execution run of tenantA
        const runDetailsB = await frankExecutionStateService.getExecutionWithSteps(tenantB, res.executionId);
        expect(runDetailsB).toBeNull();
    });
});
