import { sql } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { securityEdgeEvents } from '../../drizzle/schema';
import crypto from 'node:crypto';

export interface EdgeSecurityEventInput {
    requestId: string;
    route: string;
    reason: 'invalid_jwt' | 'tenant_mismatch' | 'public_kill_switch_triggered' | 'unauthorized_access' | 'header_spoof_detected';
    ip?: string | null;
    tenantClaim?: string | null;
    userClaim?: string | null;
}

export function hashIp(ip: string | null | undefined): string | null {
    if (!ip) return null;
    // We add a pepper to the hash specifically for IP addresses to make rainbow tables harder
    // For local edge hashing, if AUTH_SECRET is missing, we use a fallback pepper
    const pepper = process.env.PII_ENCRYPTION_KEY || process.env.AUTH_SECRET || 'fallback-ip-pepper-condstore';
    return crypto.createHash('sha256').update(`${ip}:${pepper}`).digest('hex');
}

/**
 * Logs a security event at the edge layer.
 * This function guarantees non-blocking execution by catching potential database errors internally.
 * Does NOT leak raw IPs, tokens, or PII.
 */
export async function logEdgeSecurityEvent(input: EdgeSecurityEventInput): Promise<void> {
    try {
        const ipHash = hashIp(input.ip);

        // Edge runtime compatibility restricts db calls in some providers, but Drizzle over HTTP (e.g. planetscale) 
        // works. If using standard mysql2 driver, it might fail in Next middleware on Vercel Edge.
        // We will execute a best-effort async insert. If it crashes (e.g. edge incompatibility), we log to console safely.
        const db = await getDb();
        await db.insert(securityEdgeEvents).values({
            id: crypto.randomUUID(),
            requestId: input.requestId,
            route: input.route.substring(0, 255), // Truncate safely
            reason: input.reason,
            ipHash: ipHash,
            tenantClaim: input.tenantClaim || null,
            userClaim: input.userClaim || null,
        }).execute();

    } catch (err) {
        // Fire-and-forget fallback to standard output if DB insert fails at edge
        console.warn(`[Edge Security Telemetry Failed] ${input.reason} on ${input.route} | Req: ${input.requestId}`);
    }
}
