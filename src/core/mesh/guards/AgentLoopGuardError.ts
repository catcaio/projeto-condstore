export class AgentLoopGuardError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AgentLoopGuardError';
    }
}
