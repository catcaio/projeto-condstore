import { afterEach, describe, expect, it } from 'vitest';
import { executeFrankTool, FrankToolAccessError } from './tool-guard';

const ORIGINAL_FRANK_MODE = process.env.FRANK_MODE;

afterEach(() => {
    if (ORIGINAL_FRANK_MODE === undefined) {
        delete process.env.FRANK_MODE;
        return;
    }

    process.env.FRANK_MODE = ORIGINAL_FRANK_MODE;
});

describe('executeFrankTool', () => {
    it('blocks mutation tools in assistant mode', async () => {
        process.env.FRANK_MODE = 'assistant';

        await expect(
            executeFrankTool({
                tenantId: 'tenant-test',
                toolName: 'create_order_from_quote',
                access: 'mutation',
                run: async () => 'should-not-run',
            }),
        ).rejects.toBeInstanceOf(FrankToolAccessError);
    });

    it('allows read-only tools in assistant mode', async () => {
        process.env.FRANK_MODE = 'assistant';

        await expect(
            executeFrankTool({
                tenantId: 'tenant-test',
                toolName: 'get_recent_orders',
                access: 'read_only',
                run: async () => 'ok',
            }),
        ).resolves.toBe('ok');
    });
});
