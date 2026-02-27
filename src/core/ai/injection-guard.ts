export class InjectionGuard {
    private readonly heuristics: string[] = [
        "ignore previous instructions",
        "ignore all previous instructions",
        "system prompt",
        "override policy",
        "developer message",
        "you are a developer",
        "you are an admin",
        "override system",
        "forget your instructions"
    ];

    public detectInjection(text: string): boolean {
        if (!text) return false;

        const lower = text.toLowerCase();

        for (const pattern of this.heuristics) {
            if (lower.includes(pattern)) {
                return true;
            }
        }

        return false;
    }
}

export const injectionGuard = new InjectionGuard();
