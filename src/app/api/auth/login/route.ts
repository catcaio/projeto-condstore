import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userRepository } from '@/infra/repositories/user.repository';
import { verifyPassword } from '@/infra/auth/password';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';
import { checkRateLimit } from '@/infra/rate-limiter';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Dados inválidos' },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        // Rate Limit: 5 attempts per minute per IP+Email
        const ip = request.headers.get("x-forwarded-for") ?? "unknown";
        const rateLimitKey = `login:${ip}:${email}`;

        const rateLimit = await checkRateLimit(rateLimitKey, 5, 60);

        if (!rateLimit.allowed) {
            logger.warn('Login rate limit exceeded', { email, ip });
            return NextResponse.json(
                { success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
                { status: 429 }
            );
        }

        const user = await userRepository.getUserByEmail(email);
        if (!user) {
            logger.warn('Login attempt for unknown email', { email });
            return NextResponse.json(
                { success: false, error: 'Email ou senha inválidos' },
                { status: 401 }
            );
        }

        const valid = verifyPassword(password, user.passwordHash);
        if (!valid) {
            logger.warn('Invalid password attempt', { email });
            return NextResponse.json(
                { success: false, error: 'Email ou senha inválidos' },
                { status: 401 }
            );
        }

        const token = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        });

        logger.info('User logged in', { email: user.email, tenantId: user.tenantId });

        const response = NextResponse.json({
            success: true,
            user: { email: user.email, role: user.role },
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60, // 8 hours
        });

        return response;
    } catch (error) {
        logger.error('Login failed', error as Error);
        return NextResponse.json(
            { success: false, error: 'Erro interno' },
            { status: 500 }
        );
    }
}
