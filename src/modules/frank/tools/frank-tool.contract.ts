import { z } from 'zod';

export type FrankCapability =
    | 'READ'
    | 'QUERY'
    | 'SEARCH'
    | 'WRITE'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'EXTERNAL_API'
    | 'FINANCIAL'
    | 'COMMUNICATION'
    | 'SECURITY_SENSITIVE';

export type FrankSideEffect =
    | 'NONE'
    | 'STATE_MUTATION'
    | 'EXTERNAL_DISPATCH'
    | 'PERSISTENCE_WRITE'
    | 'NOTIFICATION_SENT';

export type FrankToolRiskClass = 'SAFE' | 'GUARDED' | 'CRITICAL';

export interface ToolExecutionContext {
    tenantId: string;
    requestId: string;
    userId?: string;
    allowHighRisk?: boolean;
    humanApprovalToken?: string;
}

export interface FrankToolContract<TInput = unknown, TOutput = unknown> {
    name: string;
    description: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
    isReadOnly: boolean;
    riskClass: FrankToolRiskClass;
    capabilities: FrankCapability[];
    sideEffects: FrankSideEffect[];
    needsPermissions?: string[];
    execute: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;
    metadata?: {
        version?: string;
        domain?: string;
        author?: string;
        [key: string]: unknown;
    };
}

/**
 * Validates invariant integrity of a Frank Tool Contract.
 * Throws explicit error if a contract violates structural safety rules.
 */
export function validateToolContractInvariants(contract: FrankToolContract<any, any>): void {
    if (!contract.name || typeof contract.name !== 'string' || contract.name.trim().length === 0) {
        throw new Error('Frank Tool Contract must declare a non-empty name.');
    }

    if (!contract.description || typeof contract.description !== 'string') {
        throw new Error(`Frank Tool Contract [${contract.name}] must declare a description.`);
    }

    if (!contract.inputSchema || typeof contract.inputSchema.safeParse !== 'function') {
        throw new Error(`Frank Tool Contract [${contract.name}] must provide a valid Zod inputSchema.`);
    }

    if (!contract.outputSchema || typeof contract.outputSchema.safeParse !== 'function') {
        throw new Error(`Frank Tool Contract [${contract.name}] must provide a valid Zod outputSchema.`);
    }

    if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
        throw new Error(`Frank Tool Contract [${contract.name}] must declare at least one capability.`);
    }

    if (!Array.isArray(contract.sideEffects)) {
        throw new Error(`Frank Tool Contract [${contract.name}] must declare sideEffects array.`);
    }

    // Invariant: Read-only tools CANNOT produce persistent mutations or external dispatches
    if (contract.isReadOnly) {
        const forbiddenSideEffects: FrankSideEffect[] = [
            'STATE_MUTATION',
            'PERSISTENCE_WRITE',
            'EXTERNAL_DISPATCH',
        ];
        const invalidEffect = contract.sideEffects.find(se => forbiddenSideEffects.includes(se));
        if (invalidEffect) {
            throw new Error(
                `Frank Tool Contract [${contract.name}] is declared as isReadOnly=true but lists sideEffect [${invalidEffect}].`
            );
        }

        const forbiddenCapabilities: FrankCapability[] = ['WRITE', 'CREATE', 'UPDATE', 'DELETE'];
        const invalidCap = contract.capabilities.find(c => forbiddenCapabilities.includes(c));
        if (invalidCap) {
            throw new Error(
                `Frank Tool Contract [${contract.name}] is declared as isReadOnly=true but lists mutation capability [${invalidCap}].`
            );
        }
    }
}
