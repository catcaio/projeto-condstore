import { randomUUID } from 'crypto';
import { getDb } from '../../../infra/db';
import { tokenUsageEvents } from '../../../drizzle/schema';
import { AgentLoopGuardError } from './AgentLoopGuardError';

export class AgentRuntimeGuard {
    public maxIterations = 5;
    public maxToolCalls = 10;
    public maxExecutionTimeMs = 25000;

    private iterationCount = 0;
    private toolCallCount = 0;
    private readonly startTime: number;

    constructor(
        private readonly tenantId: string,
        private readonly requestId: string
    ) {
        this.startTime = Date.now();
    }

    async incrementIteration() {
        this.iterationCount++;
        await this.assertLimits();
    }

    async incrementToolCall() {
        this.toolCallCount++;
        await this.assertLimits();
    }

    async assertLimits() {
        const elapsed = Date.now() - this.startTime;

        let violation = '';
        if (this.iterationCount > this.maxIterations) {
            violation = `Max iterations exceeded: ${this.iterationCount} > ${this.maxIterations}`;
        } else if (this.toolCallCount > this.maxToolCalls) {
            violation = `Max tool calls exceeded: ${this.toolCallCount} > ${this.maxToolCalls}`;
        } else if (elapsed > this.maxExecutionTimeMs) {
            violation = `Max execution time exceeded: ${elapsed}ms > ${this.maxExecutionTimeMs}ms`;
        }

        if (violation) {
            const errorMessage = `[AgentRuntimeGuard] Violation for tenant ${this.tenantId} (req: ${this.requestId}): ${violation}`;

            // Fire and forget safety log avoiding breaking the throw path completely if DB goes down
            await this.logViolation();

            throw new AgentLoopGuardError(errorMessage);
        }
    }

    async finalize() {
        await this.assertLimits(); // One last check
    }

    private async logViolation() {
        try {
            const db = await getDb();
            await db.insert(tokenUsageEvents).values({
                id: randomUUID(),
                traceId: randomUUID(), // synthetic trace for guard violations
                tenantId: this.tenantId,
                type: 'loop_guard_violation',
                modelUsed: 'none',
                inputTokens: 0,
                outputTokens: 0,
                estimatedCostUsd: '0',
                createdAt: new Date()
            });
        } catch (e) {
            // Intentionally swallowed: Guard exception must rise!
        }
    }
}
