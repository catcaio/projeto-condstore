export class CircuitOpenError extends Error {
    public readonly providerName: string;

    constructor(providerName: string, message?: string) {
        super(message ?? `Circuit breaker is OPEN for provider: ${providerName}`);
        this.name = 'CircuitOpenError';
        this.providerName = providerName;
    }
}
