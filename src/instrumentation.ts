import { assertCriticalEnvSetup } from './infra/env/require-env';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            console.log("=> Bootstrapping Node.js Platform Instrumentation");
            assertCriticalEnvSetup();
        } catch (err: any) {
            console.error(err.message);
            process.exit(1);
        }
    }
}
