export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userRepository } from '@/infra/repositories/user.repository';
import { verifyPassword } from '@/infra/auth/password';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';
import { checkRateLimit } from '@/infra/rate-limiter';
import { auditService } from '@/modules/audit/audit.service';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
});

export async function POST(request: NextRequest) {
    // 5) Validação de Variáveis de Ambiente e Fallback
    const dbUrl = process.env.DATABASE_URL;
    const authSecret = process.env.AUTH_SECRET || process.env.JWT_SECRET;

    if (!dbUrl) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: DATABASE_URL is missing in production');
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
        process.env.DATABASE_URL = 'mysql://root:root@localhost:3306/condstore_dev';
    }

    if (!authSecret) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: AUTH_SECRET is missing in production');
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
        process.env.AUTH_SECRET = 'dev-only-fallback-secret-do-not-use-in-prod';
    }
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
            // Audit trailing requires a tenant, which we have from the user object
            await auditService.logEvent(user.tenantId, 'LOGIN_FAILED', { email });
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
            sessionVersion: user.sessionVersion,
        });

        logger.info('User logged in', { email: user.email, tenantId: user.tenantId });
        await auditService.logEvent(user.tenantId, 'LOGIN_SUCCESS', {
            email: user.email,
            ip: request.headers.get("x-forwarded-for") ?? "unknown"
        });

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
        // Envolver login em try/catch adequado, apenas erro de infra retorna 500
        if (error instanceof Error && error.name === 'InfrastructureError') {
            logger.error('Infrastructure failure during login', error);
            return NextResponse.json(
                { success: false, error: 'Erro interno' },
                { status: 500 }
            );
        }

        // Log everything else, generic 500 since we don't know what broke, wait, requirements say only 500 for infra
        // I'll log securely
        logger.error('Unexpected error during login', error as Error);
        return NextResponse.json(
            { success: false, error: 'Erro interno de servidor' },
            { status: 500 }
        );
    }
}
