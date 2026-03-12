import { logger } from '@/infra/logger';

export type FrankMode = 'default' | 'assistant';
export type FrankToolAccess = 'read_only' | 'mutation';

export type FrankToolName =
    | 'create_order_from_quote'
    | 'get_customer_context'
    | 'get_recent_orders'
    | 'get_order_status'
    | 'get_shipment_status'
    | 'get_recent_quotes';

export class FrankToolAccessError extends Error {
    constructor(public readonly toolName: FrankToolName) {
        super(`Tool "${toolName}" is blocked in assistant mode.`);
        this.name = 'FrankToolAccessError';
    }
}

export function getFrankMode(): FrankMode {
    return process.env.FRANK_MODE?.trim().toLowerCase() === 'assistant'
        ? 'assistant'
        : 'default';
}

export function isFrankAssistantMode(): boolean {
    return getFrankMode() === 'assistant';
}

export async function executeFrankTool<T>(params: {
    tenantId: string;
    toolName: FrankToolName;
    access: FrankToolAccess;
    run: () => Promise<T>;
}): Promise<T> {
    const mode = getFrankMode();

    if (mode === 'assistant' && params.access !== 'read_only') {
        logger.warn('frank_tool_blocked', {
            tenantId: params.tenantId,
            toolName: params.toolName,
            mode,
        });
        throw new FrankToolAccessError(params.toolName);
    }

    logger.info('frank_tool_executing', {
        tenantId: params.tenantId,
        toolName: params.toolName,
        mode,
        access: params.access,
    });

    return params.run();
}
