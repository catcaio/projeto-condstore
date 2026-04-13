import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import {
    extractInternalRequestCredentials,
    isInternalTokenAuthorizedForPurpose,
} from './infra/config/internal-token-contract';
import { getAuthSecretBytes } from './infra/env/critical-runtime';
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
        '/api/:path*',
        '/t/:path*'
    ],
};

function getAuthSecret(): Uint8Array {
    return getAuthSecretBytes();
}

interface MiddlewareSessionClaims {
    sub: string;
    tenantId: string;
    role: string;
}

async function verifyMiddlewareSessionToken(token: string): Promise<MiddlewareSessionClaims | null> {
    const secret = getAuthSecret();

    try {
        const { payload } = await jwtVerify(token, secret);
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

function isPublicTrackingPath(pathname: string): boolean {
    const segments = pathname.split('/').filter(Boolean);
    return segments.length === 2 && segments[0] === 't';
}

function misconfiguredResponse(pathname: string, code: string): NextResponse {
    if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error', code }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
}

export async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const isTrackingPath = pathname.startsWith('/t/');
    const isPublicTrackingRoute = isPublicTrackingPath(pathname);

    const requestHeaders = new Headers(req.headers);
    const clientIp = requestHeaders.get('x-forwarded-for');
    const requestId = requestHeaders.get('x-request-id') || 'unknown';

    const spoofedHeadersDetected = ['x-tenant-id', 'x-auth-tenant-id', 'x-auth-role', 'x-auth-user-id', 'x-auth-email', 'x-role', 'x-user-id'].some(h => requestHeaders.has(h));

    if (spoofedHeadersDetected) {
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

    if (pathname.startsWith('/api/public/')) {
        if (process.env.PUBLIC_ENDPOINTS_DISABLED === 'true') {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'public_kill_switch_triggered',
                ip: clientIp
            });
            return new NextResponse(JSON.stringify({ error: 'Service temporarily unavailable' }), {
                status: 503,
                headers: { 'content-type': 'application/json' },
            });
        }
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (
        pathname.startsWith('/api/webhooks/') ||
        pathname.startsWith('/api/webhook/') ||
        pathname === '/api/health' ||
        pathname.startsWith('/api/auth/') ||
        pathname.startsWith('/api/whatsapp/') ||
        pathname === '/api/cron/cleanup' ||
        isPublicTrackingRoute
    ) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname.startsWith('/api/internal/') || pathname === '/api/debug') {
        const credentials = extractInternalRequestCredentials(req);
        const isAuthorized =
            isInternalTokenAuthorizedForPurpose('any', credentials) ||
            (pathname === '/api/internal/qa/bootstrap-session' || pathname === '/api/internal/qa/setup'
                ? isInternalTokenAuthorizedForPurpose('qa_bootstrap', credentials)
                : false);

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

    // Allowlist for autonomous/internal-token API routes that do not use the session cookie.
    // These routes implement their own authentication (e.g. internal token, cron headers)
    // and should not be blocked by the generic `/api/*` session-cookie gate.
    const autonomousApiPaths = [
        '/api/cron/cleanup',
        '/api/db/migrate',
        '/api/painel-logistico',
        '/api/supreme/ecosystem',
    ];

    if (autonomousApiPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieToken) {
        if (pathname.startsWith('/api/')) {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'unauthorized_access',
                ip: clientIp
            });
            return unauthorizedJsonResponse('Missing authentication token');
        } else if (
            isTrackingPath ||
            pathname.startsWith('/dashboard/') ||
            pathname.startsWith('/cockpit/') ||
            pathname.startsWith('/operacao/') ||
            pathname.startsWith('/inbox/')
        ) {
            // For UI routes, redirect to login
            const loginUrl = new URL('/auth/login', req.url);
            loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
            return NextResponse.redirect(loginUrl);
        }
    }

    if (cookieToken) {
        let session: MiddlewareSessionClaims | null;

        try {
            session = await verifyMiddlewareSessionToken(cookieToken);
        } catch (error) {
            const code = error instanceof Error ? error.message : 'MISCONFIG_AUTH_SECRET';
            console.error('[middleware] failed fast due to auth secret misconfiguration', { code, pathname, requestId });
            return misconfiguredResponse(pathname, code);
        }

        if (!session) {
            await logEdgeSecurityEvent({
                requestId,
                route: pathname,
                reason: 'invalid_jwt',
                ip: clientIp
            });
            if (pathname.startsWith('/api/')) {
                return unauthorizedJsonResponse('Invalid or expired authentication token');
            } else {
                const loginUrl = new URL('/auth/login', req.url);
                loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
                return NextResponse.redirect(loginUrl);
            }
        }

        requestHeaders.set('x-auth-tenant-id', session.tenantId);
        requestHeaders.set('x-auth-user-id', session.sub);
        requestHeaders.set('x-auth-role', session.role);

        if (pathname.startsWith('/api/tenants/')) {
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
