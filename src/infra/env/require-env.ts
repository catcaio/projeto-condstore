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
}

/**
 * Validates critical environment variables for API routes.
 * Returns a JSON NextResponse if misconfigured, or null if OK.
 */
export function getEnvMisconfigurationResponse(requestId: string): import('next/server').NextResponse | null {
    try {
        if (process.env.NODE_ENV === 'test') return null;
        
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
        const { NextResponse } = require('next/server');
        return NextResponse.json(
            { 
                success: false, 
                error: 'Sistema em manutenção ou misconfigurado.', 
                code: 'MISCONFIGURED_RUNTIME',
                details: error.message,
                requestId 
            },
            { status: 500 }
        );
    }
}
