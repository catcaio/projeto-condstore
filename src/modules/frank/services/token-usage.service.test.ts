import { describe, expect, it, vi } from 'vitest';
import { FrankTokenUsageService } from './token-usage.service';
import { FrankDailyLimitExceededError } from '../frank.errors';

function createInMemoryStore() {
    const data = new Map<string, number>();

    return {
        store: {
            async addDailyUsage(input: { tenantId: string; dayKey: string; tokens: number }) {
                const key = `${input.tenantId}:${input.dayKey}`;
                data.set(key, (data.get(key) ?? 0) + input.tokens);
            },
            async getDailyUsage(input: { tenantId: string; dayKey: string }) {
                return data.get(`${input.tenantId}:${input.dayKey}`) ?? 0;
            },
        },
        setUsage(tenantId: string, dayKey: string, tokens: number) {
            data.set(`${tenantId}:${dayKey}`, tokens);
        },
        getUsage(tenantId: string, dayKey: string) {
            return data.get(`${tenantId}:${dayKey}`) ?? 0;
        },
    };
}

function createLockManager() {
    const locks = new Map<string, string>();

    return {
        async acquireLock(key: string, _ttlSec: number) {
            if (locks.has(key)) {
                return { acquired: false, token: `${key}-busy` };
            }

            const token = `${key}-${Math.random().toString(36).slice(2)}`;
            locks.set(key, token);
            return { acquired: true, token };
        },
        async releaseLock(key: string, token: string) {
            if (locks.get(key) === token) {
                locks.delete(key);
            }
        },
    };
}

function createService(options?: {
    dayKey?: string;
    dailyLimit?: number;
    store?: ReturnType<typeof createInMemoryStore>;
}) {
    const storeBundle = options?.store ?? createInMemoryStore();
    const lockManager = createLockManager();
    let currentDayKey = options?.dayKey ?? '2026-04-13';

    const publishOperationalEvent = vi.fn().mockResolvedValue(undefined);
    const log = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };

    const service = new FrankTokenUsageService({
        now: () => new Date(`${currentDayKey}T12:00:00.000Z`),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5))),
        resolveTenantContext: async () => ({
            dayKey: currentDayKey,
            timezone: 'UTC',
            dailyLimit: options?.dailyLimit ?? 100,
        }),
        store: storeBundle.store,
        acquireLock: lockManager.acquireLock,
        releaseLock: lockManager.releaseLock,
        publishOperationalEvent,
        log,
    });

    return {
        service,
        store: storeBundle,
        publishOperationalEvent,
        log,
        setDayKey(dayKey: string) {
            currentDayKey = dayKey;
        },
    };
}

describe('FrankTokenUsageService', () => {
    it('increments tokens correctly and aggregates by day', async () => {
        const { service, store } = createService({ dailyLimit: 1000 });

        await service.addUsage('tenant-a', 40);
        await service.addUsage('tenant-a', 60);

        expect(await service.getUsageToday('tenant-a')).toBe(100);
        expect(store.getUsage('tenant-a', '2026-04-13')).toBe(100);
    });

    it('keeps usage isolated by tenant and local day key', async () => {
        const harness = createService({ dailyLimit: 1000 });

        await harness.service.addUsage('tenant-a', 25);
        await harness.service.addUsage('tenant-b', 30);
        harness.setDayKey('2026-04-14');
        await harness.service.addUsage('tenant-a', 10);

        expect(harness.store.getUsage('tenant-a', '2026-04-13')).toBe(25);
        expect(harness.store.getUsage('tenant-b', '2026-04-13')).toBe(30);
        expect(harness.store.getUsage('tenant-a', '2026-04-14')).toBe(10);
    });

    it('allows execution below the daily limit and records response tokens', async () => {
        const { service, publishOperationalEvent } = createService({ dailyLimit: 100 });

        const result = await service.executeTrackedCall({
            tenantId: 'tenant-a',
            model: 'gpt-4o-mini',
            callSite: 'test.normal',
            execute: async () => ({
                result: 'ok',
                usage: {
                    prompt_tokens: 30,
                    completion_tokens: 20,
                },
            }),
        });

        expect(result.result).toBe('ok');
        expect(result.usage.totalTokens).toBe(50);
        expect(result.usage.usageSource).toBe('response_components');
        expect(result.tokensUsedToday).toBe(50);
        expect(await service.getUsageToday('tenant-a')).toBe(50);
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-a',
            eventType: 'frank_llm_usage_recorded',
        }));
    });

    it('blocks execution when the daily limit is already reached', async () => {
        const { service, store, publishOperationalEvent } = createService({ dailyLimit: 100 });
        store.setUsage('tenant-a', '2026-04-13', 100);
        const execute = vi.fn();

        await expect(service.executeTrackedCall({
            tenantId: 'tenant-a',
            model: 'gpt-4o-mini',
            callSite: 'test.blocked',
            execute: async () => {
                execute();
                return { result: 'blocked', usage: { total_tokens: 10 } };
            },
        })).rejects.toBeInstanceOf(FrankDailyLimitExceededError);

        expect(execute).not.toHaveBeenCalled();
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-a',
            eventType: 'frank_llm_usage_blocked',
        }));
    });

    it('serializes concurrent calls so the second one sees the updated total and gets blocked', async () => {
        const { service, store } = createService({ dailyLimit: 100 });
        store.setUsage('tenant-a', '2026-04-13', 95);

        let releaseFirstCall!: () => void;
        const firstCallGate = new Promise<void>((resolve) => {
            releaseFirstCall = resolve;
        });

        const executedCalls: string[] = [];
        const firstCall = service.executeTrackedCall({
            tenantId: 'tenant-a',
            model: 'gpt-4o-mini',
            callSite: 'test.concurrent.first',
            execute: async () => {
                executedCalls.push('first');
                await firstCallGate;
                return {
                    result: 'first-result',
                    usage: { total_tokens: 10 },
                };
            },
        });

        await new Promise((resolve) => setTimeout(resolve, 20));

        const secondCall = service.executeTrackedCall({
            tenantId: 'tenant-a',
            model: 'gpt-4o-mini',
            callSite: 'test.concurrent.second',
            execute: async () => {
                executedCalls.push('second');
                return {
                    result: 'second-result',
                    usage: { total_tokens: 10 },
                };
            },
        });

        releaseFirstCall();

        await expect(firstCall).resolves.toEqual(expect.objectContaining({
            result: 'first-result',
            tokensUsedToday: 105,
        }));
        await expect(secondCall).rejects.toBeInstanceOf(FrankDailyLimitExceededError);
        expect(executedCalls).toEqual(['first']);
        expect(store.getUsage('tenant-a', '2026-04-13')).toBe(105);
    });
});
