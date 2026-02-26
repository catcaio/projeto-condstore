import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'development') {
        return NextResponse.json({ error: 'Fora do ambiente de desenvolvimento' }, { status: 403 });
    }

    const token = request.headers.get('x-internal-token') || request.nextUrl.searchParams.get('token');
    if (!token || token !== process.env.INTERNAL_TOKEN) {
        return NextResponse.json({
            error: 'Token interno não fornecido ou inválido',
            instruction: 'Defina INTERNAL_TOKEN no .env.local e passe via header x-internal-token ou ?token='
        }, { status: 401 });
    }

    try {
        const db = await getDb();
        const results = await db
            .select()
            .from(users)
            .where(eq(users.role, 'admin'))
            .limit(1);

        if (results.length === 0) {
            return NextResponse.json({ error: 'Nenhum usuário admin encontrado para gerar sessão.' }, { status: 404 });
        }

        const user = results[0];

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
