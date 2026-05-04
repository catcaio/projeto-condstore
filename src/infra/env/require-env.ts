import { getMissingCriticalInternalTokenEnvs, isStrictRuntimeEnvironment } from '../config/internal-token-contract';
import { getAuthSecretValue, isDevelopmentRuntimeStrict, readTrimmedEnv, requireDatabaseUrl } from './critical-runtime';
import { getPiiEncryptionKey } from '../pii/crypto';

export function requireEnv(key: string, fallback?: string): string {
    const val = readTrimmedEnv(key);
    if (!val) {
        if (fallback !== undefined) {
            if (isDevelopmentRuntimeStrict()) {
                console.warn(`[WARN] Missing env ${key}. Using fallback only because NODE_ENV=development.`);
                return fallback;
            }
        }
        throw new Error(`CRITICAL STARTUP ERROR: Missing required environment variable: ${key}`);
    }
    return val;
}

export function assertAuthEnv() {
    requireDatabaseUrl();
    getAuthSecretValue();
    getPiiEncryptionKey();
}

export function assertInternalEnv() {
    if (isStrictRuntimeEnvironment()) {
        const missing = getMissingCriticalInternalTokenEnvs();
        if (missing.length > 0) {
            throw new Error(`Missing internal tokens: ${missing.join(', ')}`);
        }
    }
}

export function assertCriticalEnvSetup() {
    if (process.env.NODE_ENV === 'test') return;

    try {
        assertAuthEnv();
        assertInternalEnv();
        console.info('✅ Critical Environment Variables Verified.');
    } catch (err: any) {
        console.error(`[CRITICAL] Environment verification failed: ${err.message}`);
        if (isStrictRuntimeEnvironment()) {
            throw err;
        }
    }
}

/**
 * Validates critical environment variables for API routes.
 * Returns a JSON Response if misconfigured, or null if OK.
 */
export function getEnvMisconfigurationResponse(requestId: string, scope: 'auth' | 'internal' | 'all' = 'all'): any | null {
    try {
        if (process.env.NODE_ENV === 'test' && !process.env.STRICT_TEST) {
            return null;
        }
        
        if (scope === 'auth' || scope === 'all') {
            assertAuthEnv();
        }

        if (scope === 'internal' || scope === 'all') {
            assertInternalEnv();
        }
        
        return null;
    } catch (error: any) {
        const code = error.message.includes(' ') ? 'MISCONFIGURED_RUNTIME' : error.message;
        
        console.error('[ENV_MISCONFIG]', { requestId, scope, error: error.message });

        const body = JSON.stringify({ 
            success: false, 
            error: 'Sistema em manutenção ou misconfigurado.', 
            code,
            requestId 
        });

        return new Response(body, {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
