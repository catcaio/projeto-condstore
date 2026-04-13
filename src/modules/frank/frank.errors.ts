export class FrankDailyLimitExceededError extends Error {
    constructor(
        public readonly tenantId: string,
        public readonly usedTokens: number,
        public readonly dailyLimit: number,
    ) {
        super(`Frank daily token limit exceeded for tenant ${tenantId}`);
        this.name = 'FrankDailyLimitExceededError';
    }
}

export class FrankTokenUsageLockTimeoutError extends Error {
    constructor(
        public readonly tenantId: string,
        public readonly dayKey: string,
    ) {
        super(`Timed out waiting for Frank token usage lock for tenant ${tenantId} on ${dayKey}`);
        this.name = 'FrankTokenUsageLockTimeoutError';
    }
}

export class FrankMissingOpenAiApiKeyError extends Error {
    constructor() {
        super('OPENAI_API_KEY is required for Frank copilot outside development');
        this.name = 'FrankMissingOpenAiApiKeyError';
    }
}
