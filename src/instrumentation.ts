/**
 * Next.js Instrumentation Hook — runs once when the server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Used for fail-closed production safety checks (S-07 and related).
 */

export async function register() {
    // Only run in the Node.js runtime (not in the Edge runtime).
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { checkProductionSafety } = await import('./infra/bootstrap');
        checkProductionSafety();
    }
}
