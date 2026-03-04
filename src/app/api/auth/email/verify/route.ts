export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { eq, and, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token || token.length < 16) {
        return NextResponse.json(
            { success: false, error: 'Token inválido' },
            { status: 400 }
        );
    }

    try {
        const db = await getDb();
        const results = await db
            .select()
            .from(users)
            .where(eq(users.emailVerifyToken, token))
            .limit(1);

        const user = results[0];
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Token não encontrado ou já verificado' },
                { status: 404 }
            );
        }

        if (user.emailVerifiedAt) {
            const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            return NextResponse.redirect(`${baseUrl}/login?verified=true`);
        }

        await db
            .update(users)
            .set({ emailVerifiedAt: new Date(), emailVerifyToken: null })
            .where(eq(users.id, user.id));

        structuredLogger.info('email_verified', {
            eventType: 'auth_email_verify',
            userId: user.id,
            tenantId: user.tenantId,
        });

        const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        return NextResponse.redirect(`${baseUrl}/login?verified=true`);
    } catch (error) {
        structuredLogger.error('email_verify_error', {
            eventType: 'auth_email_verify',
            error,
        });
        return NextResponse.json(
            { success: false, error: 'Erro interno' },
            { status: 500 }
        );
    }
}
