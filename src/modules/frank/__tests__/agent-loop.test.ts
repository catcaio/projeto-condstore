import { describe, it, expect } from 'vitest';
import { runFrankAgentTool } from '../agent-loop';

describe('Frank agent loop (minimal)', () => {
    it('blocks HIGH_RISK action when quote is not accepted', async () => {
        const result = await runFrankAgentTool({
            requestId: 'req-1',
            action: 'CREATE_ORDER_FROM_ACCEPTED_QUOTE',
            quoteStatus: 'SENT',
            execute: async () => ({ id: 'order-1' }),
        });

        expect(result.ok).toBe(false);
        expect(result.status).toBe('BLOCKED_BY_POLICY');
        expect(result.errorCode).toBe('POLICY_BLOCKED');
        expect(result.errorMessage).toContain('cotacao precisa estar aprovada');
        expect(result.audit?.subAgent).toBe('FREIGHT');
        expect(result.audit?.handoff).toContain('precondição');
    });

    it('executes LOW_RISK action successfully', async () => {
        const result = await runFrankAgentTool({
            requestId: 'req-2',
            action: 'READ_QUOTE_CONTEXT',
            quoteStatus: 'DRAFT',
            execute: async () => ({ quoteId: 'q-1' }),
        });

        expect(result.ok).toBe(true);
        expect(result.status).toBe('EXECUTED');
        expect(result.data).toEqual({ quoteId: 'q-1' });
        expect(result.audit?.subAgent).toBe('FREIGHT');
    });


    it('blocks high-risk approval request when quote context is missing', async () => {
        const result = await runFrankAgentTool({
            requestId: 'req-approval-1',
            action: 'REQUEST_QUOTE_APPROVAL',
            quoteStatus: null,
            execute: async () => ({ ok: true }),
        });

        expect(result.ok).toBe(false);
        expect(result.status).toBe('BLOCKED_BY_POLICY');
        expect(result.errorCode).toBe('POLICY_BLOCKED');
        expect(result.errorMessage).toContain('cotação inexistente');
        expect(result.nextAllowedActions).toEqual(['READ_QUOTE_CONTEXT']);
    });

    it('always returns ToolResult shape on execution failure', async () => {
        const result = await runFrankAgentTool({
            requestId: 'req-3',
            action: 'REQUEST_QUOTE_APPROVAL',
            quoteStatus: 'SENT',
            execute: async () => {
                throw new Error('network timeout');
            },
        });

        expect(result.ok).toBe(false);
        expect(result.status).toBe('FAILED');
        expect(result.errorCode).toBe('TOOL_EXECUTION_FAILED');
        expect(result.errorMessage).toBe('network timeout');
        expect(Array.isArray(result.nextAllowedActions)).toBe(true);
    });
});
