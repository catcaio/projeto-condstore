import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Unified guard: dev-only + requires internal token or admin session
    const authResult = await requireInternalAuth(request, {
        purpose: ['diag'],
        blockUnlessDev: true,
    });
    if (!authResult.ok) return authResult.response;

    try {
        let user;
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(users)
                .where(eq(users.role, 'admin'))
                ;
            if (results.length > 0) user = results[0];
        } catch (dbError) {
            logger.warn('Failed to query DB for dev session, using mock user', { error: String(dbError) });
        }

        const forceRole = request.nextUrl.searchParams.get('role');
        const forceTenant = request.nextUrl.searchParams.get('tenantId');

        if (!user || forceRole || forceTenant) {
            user = {
                id: 'mock-admin',
                email: 'admin@condstore.com',
                tenantId: forceTenant || 'condstore',
                role: forceRole || 'admin',
                sessionVersion: 1
            };
        }

        const sessionToken = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            sessionVersion: user.sessionVersion,
        });

        logger.info('Dev session token generated', { email: user.email, role: user.role });

        const response = NextResponse.json({
            success: true,
            user: { email: user.email, role: user.role },
            message: 'Dev session gerada com sucesso e cookie setado.'
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
        logger.error('Error generating dev session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
