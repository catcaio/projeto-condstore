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

    // Allow QA_BOOTSTRAP_TOKEN or dev fallback if local
    const validTokens = [
        process.env.QA_BOOTSTRAP_TOKEN?.trim(),
        isDev ? 'condstore_dev_bypass_local_991' : null
    ].filter(Boolean);

    const hasInternalTokenHeader = !!token;
    const tokenMatched = !!token && validTokens.includes(token);

    // Logging only specific flags (never the token itself)
    logger.info('[QA Bootstrap Auth Context]', {
        hasInternalTokenHeader,
        isGithubActions,
        hasGithubHeader,
        tokenMatched,
        path: request.nextUrl.pathname
    });

    if (!isDev && (!isGithubActions || !hasGithubHeader)) {
        return NextResponse.json({
            error: "Unauthorized internal access",
            reason: "not_github_actions"
        }, { status: 401 });
    }

    if (!hasInternalTokenHeader) {
        return NextResponse.json({
            error: "Unauthorized internal access",
            reason: "missing_token"
        }, { status: 401 });
    }

    if (!tokenMatched) {
        return NextResponse.json({
            error: "Unauthorized internal access",
            reason: "bad_token"
        }, { status: 401 });
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
