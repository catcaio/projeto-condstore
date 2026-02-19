/**
 * Production safety checks run once at server startup (via instrumentation.ts).
 * Fail-closed: throws on misconfiguration so the process never starts in an unsafe state.
 */

export function checkProductionSafety(): void {
    if (process.env.NODE_ENV !== 'production') return;

    const errors: string[] = [];

    // S-07: Twilio signature validation must never be disabled in production.
    if (process.env.TWILIO_SIGNATURE_VALIDATION_ENABLED === 'false') {
        errors.push(
            '[FATAL] TWILIO_SIGNATURE_VALIDATION_ENABLED=false is not allowed in production. ' +
            'Remove the variable or set it to "true".'
        );
    }

    // AUTH_SECRET must be set in production.
    if (!process.env.AUTH_SECRET) {
        errors.push('[FATAL] AUTH_SECRET is not set in production.');
    }

    if (errors.length > 0) {
        const message = `Production safety check failed:\n${errors.join('\n')}`;
        // Use console.error so it appears in the process log even if the logger is not yet initialized.
        console.error(message);
        throw new Error(message);
    }
}
