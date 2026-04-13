import { randomUUID } from 'crypto';
import { and, eq, sql as drizzleSql } from 'drizzle-orm';
import { frankTokenUsage } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { tenantRepository } from '@/infra/repositories/tenant.repository';
import { acquireLock, releaseLock } from '@/infra/security/distributed-lock';
import { getLocalDateKey, normalizeTenantTimeZone } from '@/infra/time/window';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { configRepository } from '@/modules/config/config.repository';
import { FrankDailyLimitExceededError, FrankTokenUsageLockTimeoutError } from '../frank.errors';

const TENANT_DAILY_LIMIT_CONFIG_KEY = 'frank:daily_token_limit';
const TENANT_DAILY_LIMIT_ENV = 'TENANT_DAILY_LIMIT';
const DEFAULT_TENANT_DAILY_LIMIT = 20_000;
const LOCK_TTL_SEC = 45;
const LOCK_WAIT_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 50;

export type FrankUsageSource = 'response_total_tokens' | 'response_components' | 'missing';

export interface FrankTrackedUsage {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    usageSource: FrankUsageSource;
}

export interface ExecuteTrackedFrankLlmCallInput<T> {
    tenantId: string;
    model: string;
    callSite: string;
    execute: () => Promise<{ result: T; usage?: unknown }>;
    eventContext?: {
        customerId?: string | null;
        entityId?: string | null;
        sessionId?: string | null;
    };
}

export interface ExecuteTrackedFrankLlmCallResult<T> {
    result: T;
    usage: FrankTrackedUsage;
    tokensUsedToday: number;
    dailyLimit: number;
}

interface FrankTokenUsageContext {
    dayKey: string;
    dailyLimit: number;
    timezone: string;
}

interface FrankTokenUsageStore {
    addDailyUsage(input: { tenantId: string; dayKey: string; tokens: number }): Promise<void>;
    getDailyUsage(input: { tenantId: string; dayKey: string }): Promise<number>;
}

interface FrankTokenUsageDependencies {
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
    resolveTenantContext?: (tenantId: string, now: Date) => Promise<FrankTokenUsageContext>;
    store?: FrankTokenUsageStore;
    acquireLock?: typeof acquireLock;
    releaseLock?: typeof releaseLock;
    publishOperationalEvent?: typeof publishOperationalEvent;
    log?: Pick<typeof logger, 'info' | 'warn' | 'error'>;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return null;
}

function normalizeUsage(rawUsage: unknown): FrankTrackedUsage {
    if (!rawUsage || typeof rawUsage !== 'object') {
        return {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            usageSource: 'missing',
        };
    }

    const usage = rawUsage as Record<string, unknown>;
    const promptTokens = toPositiveInt(usage.prompt_tokens ?? usage.promptTokens) ?? 0;
    const completionTokens = toPositiveInt(usage.completion_tokens ?? usage.completionTokens) ?? 0;
    const totalTokens = toPositiveInt(usage.total_tokens ?? usage.totalTokens);

    if (totalTokens !== null) {
        return {
            totalTokens,
            promptTokens,
            completionTokens,
            usageSource: 'response_total_tokens',
        };
    }

    if (promptTokens > 0 || completionTokens > 0) {
        return {
            totalTokens: promptTokens + completionTokens,
            promptTokens,
            completionTokens,
            usageSource: 'response_components',
        };
    }

    return {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        usageSource: 'missing',
    };
}

async function resolveTenantUsageContext(tenantId: string, now: Date): Promise<FrankTokenUsageContext> {
    const [tenant, config] = await Promise.all([
        tenantRepository.getTenantById(tenantId),
        configRepository.get(tenantId, TENANT_DAILY_LIMIT_CONFIG_KEY),
    ]);

    const timezone = normalizeTenantTimeZone(tenant?.timezone);
    const configuredLimit = toPositiveInt(config?.value);
    const envLimit = toPositiveInt(process.env[TENANT_DAILY_LIMIT_ENV]);

    if (config && configuredLimit === null) {
        logger.warn('frank_daily_limit_config_invalid', {
            tenantId,
            key: TENANT_DAILY_LIMIT_CONFIG_KEY,
        });
    }

    if (process.env[TENANT_DAILY_LIMIT_ENV] && envLimit === null) {
        logger.warn('frank_daily_limit_env_invalid', {
            tenantId,
            env: TENANT_DAILY_LIMIT_ENV,
        });
    }

    return {
        timezone,
        dayKey: getLocalDateKey(now, timezone),
        dailyLimit: configuredLimit ?? envLimit ?? DEFAULT_TENANT_DAILY_LIMIT,
    };
}

const defaultStore: FrankTokenUsageStore = {
    async addDailyUsage(input) {
        const db = await getDb();
        await db.insert(frankTokenUsage).values({
            id: randomUUID(),
            tenantId: input.tenantId,
            date: input.dayKey,
            tokens: input.tokens,
            createdAt: new Date(),
        }).onDuplicateKeyUpdate({
            set: {
                tokens: drizzleSql`${frankTokenUsage.tokens} + ${input.tokens}`,
            },
        });
    },

    async getDailyUsage(input) {
        const db = await getDb();
        const [row] = await db
            .select({ tokens: frankTokenUsage.tokens })
            .from(frankTokenUsage)
            .where(
                and(
                    eq(frankTokenUsage.tenantId, input.tenantId),
                    eq(frankTokenUsage.date, input.dayKey),
                ),
            )
            .limit(1);

        return row?.tokens ?? 0;
    },
};

export class FrankTokenUsageService {
    private readonly now: () => Date;
    private readonly sleep: (ms: number) => Promise<void>;
    private readonly resolveTenantContext: (tenantId: string, now: Date) => Promise<FrankTokenUsageContext>;
    private readonly store: FrankTokenUsageStore;
    private readonly acquireLock: typeof acquireLock;
    private readonly releaseLock: typeof releaseLock;
    private readonly publishOperationalEvent: typeof publishOperationalEvent;
    private readonly log: Pick<typeof logger, 'info' | 'warn' | 'error'>;

    constructor(deps: FrankTokenUsageDependencies = {}) {
        this.now = deps.now ?? (() => new Date());
        this.sleep = deps.sleep ?? sleep;
        this.resolveTenantContext = deps.resolveTenantContext ?? resolveTenantUsageContext;
        this.store = deps.store ?? defaultStore;
        this.acquireLock = deps.acquireLock ?? acquireLock;
        this.releaseLock = deps.releaseLock ?? releaseLock;
        this.publishOperationalEvent = deps.publishOperationalEvent ?? publishOperationalEvent;
        this.log = deps.log ?? logger;
    }

    async addUsage(tenantId: string, tokens: number): Promise<void> {
        const normalizedTokens = Math.max(0, Math.trunc(tokens));
        if (normalizedTokens === 0) {
            return;
        }

        const context = await this.resolveTenantContext(tenantId, this.now());
        await this.store.addDailyUsage({
            tenantId,
            dayKey: context.dayKey,
            tokens: normalizedTokens,
        });
    }

    async getUsageToday(tenantId: string): Promise<number> {
        const context = await this.resolveTenantContext(tenantId, this.now());
        return this.store.getDailyUsage({
            tenantId,
            dayKey: context.dayKey,
        });
    }

    async executeTrackedCall<T>(
        input: ExecuteTrackedFrankLlmCallInput<T>,
    ): Promise<ExecuteTrackedFrankLlmCallResult<T>> {
        const context = await this.resolveTenantContext(input.tenantId, this.now());

        return this.withTenantDayLock(input.tenantId, context.dayKey, async () => {
            const tokensUsedBefore = await this.store.getDailyUsage({
                tenantId: input.tenantId,
                dayKey: context.dayKey,
            });

            if (tokensUsedBefore >= context.dailyLimit) {
                this.log.warn('frank_llm_daily_limit_blocked', {
                    tenantId: input.tenantId,
                    callSite: input.callSite,
                    model: input.model,
                    tokensUsedToday: tokensUsedBefore,
                    dailyLimit: context.dailyLimit,
                    dayKey: context.dayKey,
                });

                await this.publishOperationalEvent({
                    tenantId: input.tenantId,
                    eventType: 'frank_llm_usage_blocked',
                    eventDomain: 'OPERATIONS',
                    customerId: input.eventContext?.customerId ?? null,
                    entityId: input.eventContext?.entityId ?? null,
                    sessionId: input.eventContext?.sessionId ?? null,
                    payload: {
                        callSite: input.callSite,
                        model: input.model,
                        tokensUsedToday: tokensUsedBefore,
                        dailyLimit: context.dailyLimit,
                        dayKey: context.dayKey,
                    },
                });

                throw new FrankDailyLimitExceededError(
                    input.tenantId,
                    tokensUsedBefore,
                    context.dailyLimit,
                );
            }

            const executed = await input.execute();
            const usage = normalizeUsage(executed.usage);

            if (usage.usageSource === 'missing') {
                this.log.warn('frank_llm_usage_missing', {
                    tenantId: input.tenantId,
                    callSite: input.callSite,
                    model: input.model,
                    tokensUsedToday: tokensUsedBefore,
                });
            }

            if (usage.totalTokens > 0) {
                await this.store.addDailyUsage({
                    tenantId: input.tenantId,
                    dayKey: context.dayKey,
                    tokens: usage.totalTokens,
                });
            }

            const tokensUsedToday = tokensUsedBefore + usage.totalTokens;

            this.log.info('frank_llm_tokens_recorded', {
                tenantId: input.tenantId,
                callSite: input.callSite,
                model: input.model,
                tokens: usage.totalTokens,
                tokensUsedToday,
                dailyLimit: context.dailyLimit,
                usageSource: usage.usageSource,
            });

            await this.publishOperationalEvent({
                tenantId: input.tenantId,
                eventType: 'frank_llm_usage_recorded',
                eventDomain: 'OPERATIONS',
                customerId: input.eventContext?.customerId ?? null,
                entityId: input.eventContext?.entityId ?? null,
                sessionId: input.eventContext?.sessionId ?? null,
                payload: {
                    callSite: input.callSite,
                    model: input.model,
                    tokens: usage.totalTokens,
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    usageSource: usage.usageSource,
                    tokensUsedToday,
                    dailyLimit: context.dailyLimit,
                    dayKey: context.dayKey,
                    timezone: context.timezone,
                },
            });

            return {
                result: executed.result,
                usage,
                tokensUsedToday,
                dailyLimit: context.dailyLimit,
            };
        });
    }

    private async withTenantDayLock<T>(
        tenantId: string,
        dayKey: string,
        callback: () => Promise<T>,
    ): Promise<T> {
        const lockKey = `frank:token-usage:${tenantId}:${dayKey}`;
        const startedAt = Date.now();

        while ((Date.now() - startedAt) <= LOCK_WAIT_TIMEOUT_MS) {
            const lock = await this.acquireLock(lockKey, LOCK_TTL_SEC);

            if (lock.acquired) {
                try {
                    return await callback();
                } finally {
                    await this.releaseLock(lockKey, lock.token).catch((error) => {
                        this.log.warn('frank_token_usage_lock_release_failed', {
                            tenantId,
                            dayKey,
                            error: (error as Error).message,
                        });
                    });
                }
            }

            await this.sleep(LOCK_RETRY_MS);
        }

        this.log.warn('frank_token_usage_lock_timeout', {
            tenantId,
            dayKey,
            waitTimeoutMs: LOCK_WAIT_TIMEOUT_MS,
        });

        throw new FrankTokenUsageLockTimeoutError(tenantId, dayKey);
    }
}

export const frankTokenUsageService = new FrankTokenUsageService();
