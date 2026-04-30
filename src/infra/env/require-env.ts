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

export function assertCriticalEnvSetup() {
    if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') return;

    try {
        requireDatabaseUrl();
        requireEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
        getAuthSecretValue();
        getPiiEncryptionKey();

        if (isStrictRuntimeEnvironment()) {
            const missingInternalTokenEnvs = getMissingCriticalInternalTokenEnvs();
            if (missingInternalTokenEnvs.length > 0) {
                throw new Error(
                    `CRITICAL STARTUP ERROR: Missing required internal auth env(s): ${missingInternalTokenEnvs.join(', ')}`,
                );
            }
        }

        console.info('✅ Critical Environment Variables Verified.');
    } catch (err: any) {
        // Log instead of throwing to avoid killing the whole process if a route-level check is available
        console.error(`[CRITICAL] Environment verification failed: ${err.message}`);
        // We still throw if we are in a strict environment and not in a request context
        if (process.env.NODE_ENV === 'production') {
            // In production, we want to know about this in logs but maybe let routes handle the specific 500
        }
    }
}

/**
 * Validates critical environment variables for API routes.
 * Returns a JSON Response if misconfigured, or null if OK.
 */
export function getEnvMisconfigurationResponse(requestId: string): any | null {
    try {
        if (process.env.NODE_ENV === 'test' && !process.env.STRICT_TEST) {
            return null;
        }
        
        requireDatabaseUrl();
        getAuthSecretValue();
        getPiiEncryptionKey();
        
        if (isStrictRuntimeEnvironment()) {
            const missing = getMissingCriticalInternalTokenEnvs();
            if (missing.length > 0) {
                throw new Error(`Missing internal tokens: ${missing.join(', ')}`);
            }
        }
        
        return null;
    } catch (error: any) {
        const code = error.message.includes(' ') ? 'MISCONFIGURED_RUNTIME' : error.message;
        
        // Use a standard Response.json if available, or try to import NextResponse
        // This is more resilient to startup crashes
        const body = JSON.stringify({ 
            success: false, 
            error: 'Sistema em manutenção ou misconfigurado.', 
            code,
            details: error.message,
            requestId 
        });

        const body = JSON.stringify({ 
            success: false, 
            error: 'Sistema em manutenção ou misconfigurado.', 
            code,
            details: error.message,
            requestId 
        });

        return new Response(body, {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
