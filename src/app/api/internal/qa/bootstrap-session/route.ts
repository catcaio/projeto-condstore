import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
    const isDev = process.env.NODE_ENV !== 'production';
    const hasGithubHeader = request.headers.get('x-github-actions') === 'true';

    const token = request.headers.get('x-qa-token') || request.nextUrl.searchParams.get('token');

    const hasInternalTokenHeader = !!token;
    const isProdEnvironment = process.env.VERCEL_ENV === 'production';

    // 1. In real production, unequivocally block this route.
    if (isProdEnvironment) {
        logger.warn('[QA Bootstrap] BLOCKED: Attempted to run QA route in production environment', { path: request.nextUrl.pathname });
        return NextResponse.json({ error: "Unauthorized internal access", reason: "production_blocked" }, { status: 403 });
    }

    // 2. We must have a properly configured server token
    const serverQaToken = process.env.QA_BOOTSTRAP_TOKEN?.trim();
    if (!serverQaToken) {
        logger.warn('[QA Bootstrap] BLOCKED: Server missing QA_BOOTSTRAP_TOKEN', { path: request.nextUrl.pathname });
        return NextResponse.json({ error: "Unauthorized internal access", reason: "server_misconfigured" }, { status: 401 });
    }

    // 3. The token provided in request must match exactly. We don't fall back to bypass strings anymore.
    if (!hasInternalTokenHeader || token !== serverQaToken) {
        logger.warn('[QA Bootstrap Auth Context] BLOCKED', {
            reason: "bad_token",
            path: request.nextUrl.pathname
        });
        return NextResponse.json({ error: "Unauthorized internal access", reason: "bad_token" }, { status: 401 });
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

        return response;

    } catch (error) {
        logger.error('Error generating QA session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
