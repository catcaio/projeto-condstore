import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from './lib/security/safe-compare';
import { logEdgeSecurityEvent } from './lib/security/edge-logger';

const SESSION_COOKIE_NAME = 'condstore_session';

// Matcher scopes the middleware exactly to the requested paths to avoid overhead
export const config = {
    matcher: [
        '/cockpit/:path*',
        '/dashboard/:path*',
        '/operacao/:path*',
        '/conversas/:path*',
        '/clientes/:path*',
        '/pedidos/:path*',
        '/logistica/:path*',
        '/frank/:path*',
        '/metricas/:path*',
        '/tenant/:path*',
        '/configuracoes/:path*',
        '/vendas/:path*',
        '/financeiro/:path*',
        '/sistema/:path*',
        '/supreme/:path*',
        '/home/:path*',
        '/inbox/:path*',
        '/freight/simulations/:path*',
        '/attribution/:path*',
        '/settings/:path*',
        '/api/internal/:path*',
        '/api/cockpit/:path*',
        '/api/tenants/:path*',
        '/api/admin/:path*',
        '/api/public/:path*'
    ],
};

function getAuthSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET?.trim();
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            // In production we strictly require the secret
            throw new Error('MISCONFIG_AUTH_SECRET');
        }
        return new TextEncoder().encode('dev-only-fallback-secret-do-not-use-in-prod');
    }
    return new TextEncoder().encode(secret);
}

interface MiddlewareSessionClaims {
    sub: string;
    tenantId: string;
    role: string;
}

async function verifyMiddlewareSessionToken(token: string): Promise<MiddlewareSessionClaims | null> {
    try {
        const { payload } = await jwtVerify(token, getAuthSecret());
        const claims = payload as JWTPayload & {
            tenantId?: unknown;
            role?: unknown;
        };

        if (typeof claims.sub !== 'string' || typeof claims.tenantId !== 'string' || typeof claims.role !== 'string') {
            return null;
        }

        return {
            sub: claims.sub,
            tenantId: claims.tenantId,
            role: claims.role,
        };
    } catch {
        return null;
    }
}

function unauthorizedJsonResponse(message = 'Unauthorized'): NextResponse {
    return new NextResponse(JSON.stringify({ error: message }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
    });
}

function forbiddenJsonResponse(message = 'Forbidden'): NextResponse {
    return new NextResponse(JSON.stringify({ error: message }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
    });
}

export async function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    // ==========================================
    // RULE 0: PUBLIC MATCHERS & KILL SWITCH
    // ==========================================
    if (pathname.startsWith('/api/public/')) {
        if (process.env.PUBLIC_ENDPOINTS_DISABLED === 'true') {
            await logEdgeSecurityEvent({
                requestId: req.headers.get('x-request-id') || 'unknown',
                route: pathname,
                reason: 'public_kill_switch_triggered',
                ip: req.headers.get('x-forwarded-for')
            });
            return new NextResponse(JSON.stringify({ error: 'Service temporarily unavailable' }), {
                status: 503,
                headers: { 'content-type': 'application/json' },
            });
        }
        // Public endpoints have no token auth, proceed to app router
        return NextResponse.next();
    }

    // Clone headers so we can set/strip things to pass down to Next
    const requestHeaders = new Headers(req.headers);

    // Context for telemetry
    const clientIp = requestHeaders.get('x-forwarded-for');
    const requestId = requestHeaders.get('x-request-id') || 'unknown';

    // Security Hardening: Strip potentially spoofable headers from the incoming client request
    const spoofedHeadersDetected = ['x-tenant-id', 'x-auth-tenant-id', 'x-auth-role', 'x-auth-user-id', 'x-auth-email', 'x-role', 'x-user-id'].some(h => requestHeaders.has(h));

    if (spoofedHeadersDetected) {
        // Technically we are just stripping them, but we want to log the attempt
        await logEdgeSecurityEvent({
            requestId,
            route: pathname,
            reason: 'header_spoof_detected',
            ip: clientIp
        });
    }

    requestHeaders.delete('x-tenant-id');
    requestHeaders.delete('x-auth-tenant-id');
    requestHeaders.delete('x-auth-role');
    requestHeaders.delete('x-auth-user-id');
    requestHeaders.delete('x-auth-email');
    requestHeaders.delete('x-role');
    requestHeaders.delete('x-user-id');

    // ==========================================
    // RULE 1: /api/internal/*
    // ==========================================
    if (pathname.startsWith('/api/internal/')) {
        const token = req.headers.get('x-internal-token') || req.headers.get('x-qa-token') || req.nextUrl.searchParams.get('token');

        const diagToken = process.env.INTERNAL_DIAG_TOKEN?.trim();
        const exportToken = process.env.INTERNAL_EXPORT_TOKEN?.trim();
        const jobToken = process.env.INTERNAL_JOB_TOKEN?.trim();
        const internalToken = process.env.INTERNAL_TOKEN?.trim();
        const qaToken = process.env.QA_BOOTSTRAP_TOKEN?.trim();

        // Specific endpoints that might allow token via QS (e.g. data retention job callback from Vercel cron)
        // Here we strictly check header or query using the central tokens.

        // Exception specifically for QA automation
        const isQaBootstrap = pathname === '/api/internal/qa/bootstrap-session' || pathname === '/api/internal/qa/setup';
        const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
        const hasGithubHeader = req.headers.get('x-github-actions') === 'true';

        // Exception for local development
        const isLocalDev = process.env.NODE_ENV === 'development';

        let isAuthorized =
            isLocalDev ||
            safeCompare(token, diagToken) ||
            safeCompare(token, exportToken) ||
            safeCompare(token, jobToken) ||
            safeCompare(token, internalToken);

        if (!isAuthorized && isQaBootstrap && isGithubActions && hasGithubHeader && safeCompare(token, qaToken)) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'unauthorized_access',
                ip: clientIp
            });
            return unauthorizedJsonResponse('Unauthorized internal access');
        }

        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // ==========================================
    // RULE 2: Session Check for cockpit, admin, tenants
    // ==========================================
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieToken) {
        if (pathname.startsWith('/api/cockpit/') || pathname.startsWith('/api/admin/') || pathname.startsWith('/api/tenants/')) {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'unauthorized_access',
                ip: clientIp
            });
            return unauthorizedJsonResponse('Missing authentication token');
        }
    }

    // NOTE: If missing but not hitting those above, we'd skip (though matcher prevents this code path)

    if (cookieToken) {
        const session = await verifyMiddlewareSessionToken(cookieToken);

        if (!session) {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'invalid_jwt',
                ip: clientIp
            });
            return unauthorizedJsonResponse('Invalid or expired authentication token');
        }

        // Set enriched trusted headers for downstream API handlers
        requestHeaders.set('x-auth-tenant-id', session.tenantId);
        requestHeaders.set('x-auth-user-id', session.sub);
        requestHeaders.set('x-auth-role', session.role);

        // ==========================================
        // RULE 3: /api/tenants/* 
        // ==========================================
        if (pathname.startsWith('/api/tenants/')) {
            // E.g. /api/tenants/tnt-xyz/health
            const segments = pathname.split('/').filter(Boolean);
            const idx = segments.indexOf('tenants');
            const routeTenantId = segments[idx + 1]?.trim();

            if (routeTenantId && session.tenantId !== routeTenantId) {
                await logEdgeSecurityEvent({
                    requestId,
                    route: pathname,
                    reason: 'tenant_mismatch',
                    ip: clientIp,
                    tenantClaim: session.tenantId,
                    userClaim: session.sub
                });
                return forbiddenJsonResponse('Tenant mismatch: Forbidden cross-tenant access');
            }
        }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
}
