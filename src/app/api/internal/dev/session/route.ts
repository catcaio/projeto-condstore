import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { assertDevOnly } from '@/infra/env/devOnly';
import { safeCompare } from '@/lib/security/safe-compare';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const devGuard = assertDevOnly();
    if (devGuard) return devGuard;

    const token = request.headers.get('x-internal-token') || request.nextUrl.searchParams.get('token');
    if (!safeCompare(token, process.env.INTERNAL_TOKEN)) {
        return NextResponse.json({
            error: 'Token interno não fornecido ou inválido',
            instruction: 'Defina INTERNAL_TOKEN no .env.local e passe via header x-internal-token ou ?token='
        }, { status: 401 });
    }

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
