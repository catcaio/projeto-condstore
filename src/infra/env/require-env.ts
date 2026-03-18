import { getMissingCriticalInternalTokenEnvs, isStrictRuntimeEnvironment } from '../config/internal-token-contract';

export function requireEnv(key: string, fallback?: string): string {
    const val = process.env[key];
    if (!val) {
        if (fallback !== undefined) {
            if (!isStrictRuntimeEnvironment()) {
                console.warn(`[WARN] Missing env ${key}. Using fallback in non-production environment.`);
                return fallback;
            }
        }
        throw new Error(`CRITICAL STARTUP ERROR: Missing required environment variable: ${key}`);
    }
    return val;
}

export function assertCriticalEnvSetup() {
    if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') return;

    requireEnv('DATABASE_URL');
    requireEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

    if (isStrictRuntimeEnvironment()) {
        requireEnv('AUTH_SECRET');
        const missingInternalTokenEnvs = getMissingCriticalInternalTokenEnvs();
        if (missingInternalTokenEnvs.length > 0) {
            throw new Error(
                `CRITICAL STARTUP ERROR: Missing required internal auth env(s): ${missingInternalTokenEnvs.join(', ')}`,
            );
        }
    }

    console.info('✅ Critical Environment Variables Verified.');
}
