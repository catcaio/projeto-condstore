import { getAuthSecretValue, readTrimmedEnv } from '@/infra/env/critical-runtime';

export interface EdgeSecurityEventInput {
    requestId: string;
    route: string;
    reason: 'invalid_jwt' | 'tenant_mismatch' | 'public_kill_switch_triggered' | 'unauthorized_access' | 'header_spoof_detected';
    ip?: string | null;
    tenantClaim?: string | null;
    userClaim?: string | null;
}

export async function hashIp(ip: string | null | undefined): Promise<string | null> {
    if (!ip) return null;
    const pepper = readTrimmedEnv('PII_ENCRYPTION_KEY') ?? (() => {
        try {
            return getAuthSecretValue();
        } catch (error) {
            const code = error instanceof Error ? error.message : 'EDGE_HASH_SECRET_MISSING';
            console.error('[edge-security] unable to derive IP hash pepper', { code });
            return null;
        }
    })();
    if (!pepper) {
        return null;
    }
    
    // Use Edge-compatible Web Crypto API instead of node:crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(`${ip}:${pepper}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Logs a security event at the edge layer.
 * This function guarantees non-blocking execution.
 * Does NOT leak raw IPs, tokens, or PII.
 * 
 * Node-specific imports (e.g. mysql2's stream dependency) crash the Edge Runtime.
 * Here we safely log to standard output for the log drains to pick up.
 */
export async function logEdgeSecurityEvent(input: EdgeSecurityEventInput): Promise<void> {
    const ipHash = await hashIp(input.ip).catch(() => null);
    
    console.warn(JSON.stringify({
        level: 'WARN',
        message: 'edge_security_telemetry',
        context: {
            reason: input.reason,
            route: input.route.substring(0, 255),
            requestId: input.requestId,
            ipHash,
            tenantClaim: input.tenantClaim || null,
            userClaim: input.userClaim || null,
            timestamp: new Date().toISOString()
        }
    }));
}
