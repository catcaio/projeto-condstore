import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
    const isCI = isGithubActions || process.env.CI === 'true';
    const hasGithubHeader = request.headers.get('x-github-actions') === 'true';

    const token = request.headers.get('x-qa-token') || request.nextUrl.searchParams.get('token');
    const hasTokenHeader = !!token;
    const isProdEnvironment = process.env.VERCEL_ENV === 'production';

    // 1. In real production, unequivocally block this route.
    if (isProdEnvironment) {
        logger.warn('[QA Bootstrap] BLOCKED: production_blocked', {
            path: request.nextUrl.pathname,
            method: request.method,
            isCI,
            hasTokenHeader,
            isGithubActions,
        });
        return NextResponse.json({ error: "Unauthorized internal access", code: "production_blocked" }, { status: 403 });
    }

    // 2. Resolve expected server token — QA_BOOTSTRAP_TOKEN preferred; INTERNAL_TOKEN as CI fallback.
    const serverQaToken = process.env.QA_BOOTSTRAP_TOKEN?.trim()
        || (isCI ? process.env.INTERNAL_TOKEN?.trim() : undefined);

    if (!serverQaToken) {
        logger.warn('[QA Bootstrap] BLOCKED: server_misconfigured', {
            path: request.nextUrl.pathname,
            method: request.method,
            isCI,
            hasTokenHeader,
            hasQaBootstrapToken: !!process.env.QA_BOOTSTRAP_TOKEN,
            hasInternalToken: !!process.env.INTERNAL_TOKEN,
        });
        return NextResponse.json({ error: "Unauthorized internal access", code: "server_misconfigured" }, { status: 401 });
    }

    // 3. Verify token — constant-time boolean, never log the value.
    const tokenMatched = hasTokenHeader && token === serverQaToken;

    logger.info('[QA Bootstrap] Auth context', {
        path: request.nextUrl.pathname,
        method: request.method,
        isCI,
        isGithubActions,
        hasGithubHeader,
        hasTokenHeader,
        tokenMatched,
    });

    if (!tokenMatched) {
        logger.warn('[QA Bootstrap] BLOCKED: bad_token', {
            path: request.nextUrl.pathname,
            hasTokenHeader,
            tokenMatched,
        });
        return NextResponse.json({ error: "Unauthorized internal access", code: "bad_token" }, { status: 401 });
    }

    try {
        const forceRole = request.nextUrl.searchParams.get('role') || 'admin';
        const forceTenant = request.nextUrl.searchParams.get('tenantId') || 'qa-tenant';

        const user = {
            id: 'mock-admin',
            email: 'qa@condstore.com',
            tenantId: forceTenant,
            role: forceRole,
            sessionVersion: 1
        };

        const sessionToken = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            sessionVersion: user.sessionVersion,
        });

        logger.info('QA session token generated', { email: user.email, role: user.role });

        const response = NextResponse.json({
            success: true,
            user: { email: user.email, role: user.role },
            message: 'QA session bootstrapped'
        });

        response.cookies.set(COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60, // 8 hours
        });

        // Safety assert: ensure Set-Cookie was actually emitted
        if (!response.headers.get('set-cookie')) {
            logger.error('QA Bootstrap: Set-Cookie not present after cookie.set()', undefined, {
                cookieName: COOKIE_NAME,
                role: user.role,
                tenantId: user.tenantId,
            });
            return NextResponse.json({ error: 'Session cookie could not be set', code: 'bootstrap_cookie_missing' }, { status: 500 });
        }

        logger.info('QA session bootstrapped OK', { email: user.email, role: user.role, tenantId: user.tenantId });

        return response;

    } catch (error) {
        logger.error('Error generating QA session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
