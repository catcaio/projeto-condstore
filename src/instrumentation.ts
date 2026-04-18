import { assertCriticalEnvSetup } from './infra/env/require-env';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            console.log("=> Bootstrapping Node.js Platform Instrumentation");
            assertCriticalEnvSetup();
        } catch (err: any) {
            console.error(`[FATAL] Startup verification failed: ${err.message}`);
            // In serverless environments, we throw instead of exiting to allow the platform to handle the error
            // and potentially provide better diagnostics in the logs.
            throw err;
        }
    }
}
