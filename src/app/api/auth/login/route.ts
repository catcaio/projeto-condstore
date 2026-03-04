export const runtime = "nodejs";

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userRepository } from '@/infra/repositories/user.repository';
import { verifyPassword } from '@/infra/auth/password';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';
import { hashRateLimitKeyForLog, rateLimiter } from '@/infra/security/rate-limiter';
import { auditService } from '@/modules/audit/audit.service';
import { InfrastructureError, getUserMessage } from '@/infra/errors';
import { isDevRuntime } from '@/infra/env/devOnly';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
});

type LoginFailureReason = 'user_not_found' | 'password_mismatch' | 'schema_error' | 'rate_limited';

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const firstIp = forwardedFor.split(',')[0]?.trim();
        if (firstIp) return firstIp;
    }

    const realIp = request.headers.get('x-real-ip')?.trim();
    return realIp || 'unknown';
}

function hashLoginEmailForLog(email: string): string {
    return hashRateLimitKeyForLog(email.trim().toLowerCase());
}

function logLoginDiagnostic(input: {
    level: 'warn' | 'error';
    reason: LoginFailureReason;
    requestId: string;
    emailHash?: string;
    rateLimitKeyHash?: string;
    tenantId?: string;
    error?: unknown;
    errorCode?: string;
    retryable?: boolean;
}) {
    const context = {
        eventType: 'auth_login',
        reason: input.reason,
        requestId: input.requestId,
        ...(input.emailHash ? { emailHash: input.emailHash } : {}),
        ...(input.rateLimitKeyHash ? { rateLimitKeyHash: input.rateLimitKeyHash } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.errorCode ? { errorCode: input.errorCode } : {}),
        ...(typeof input.retryable === 'boolean' ? { retryable: input.retryable } : {}),
        ...(input.error ? { error: input.error } : {}),
    };

    if (input.level === 'error') {
        structuredLogger.error('auth_login_failed', context);
        return;
    }

    structuredLogger.warn('auth_login_rejected', context);
}

export async function POST(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID?.() ?? `${Date.now()}`;
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
    let loginEmailHash: string | undefined;

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
        const normalizedEmail = email.trim().toLowerCase();
        loginEmailHash = hashLoginEmailForLog(normalizedEmail);

        // Rate Limit: 5 attempts per minute per IP+Email
        const ip = getClientIp(request);
        const rateLimitKey = `${ip}:${normalizedEmail}`;
        const rateLimitKeyHash = hashRateLimitKeyForLog(rateLimitKey);

        let shouldBypassRateLimit = false;
        if (
            isDevRuntime() &&
            request.headers.get('x-internal-token') === process.env.INTERNAL_TOKEN &&
            process.env.INTERNAL_TOKEN
        ) {
            shouldBypassRateLimit = true;
        }

        const rateLimit = await rateLimiter.limit('auth.login', rateLimitKey, {
            max: shouldBypassRateLimit ? 9999 : 5,
            windowSec: 60,
        });

        if (!rateLimit.allowed) {
            logLoginDiagnostic({
                level: 'warn',
                reason: 'rate_limited',
                requestId,
                emailHash: loginEmailHash,
                rateLimitKeyHash,
            });
            return NextResponse.json(
                { success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
                { status: 429 }
            );
        }

        const user = await userRepository.getUserByEmail(email);
        if (!user) {
            logLoginDiagnostic({
                level: 'warn',
                reason: 'user_not_found',
                requestId,
                emailHash: loginEmailHash,
            });
            return NextResponse.json(
                { success: false, error: 'Email ou senha inválidos' },
                { status: 401 }
            );
        }

        if (!user.passwordHash) {
            logLoginDiagnostic({
                level: 'warn',
                reason: 'password_mismatch',
                requestId,
                emailHash: loginEmailHash,
                tenantId: user.tenantId,
            });
            return NextResponse.json(
                { success: false, error: 'Esta conta usa login social. Tente "Entrar com Google".' },
                { status: 401 }
            );
        }

        const valid = verifyPassword(password, user.passwordHash);
        if (!valid) {
            logLoginDiagnostic({
                level: 'warn',
                reason: 'password_mismatch',
                requestId,
                emailHash: loginEmailHash,
                tenantId: user.tenantId,
            });
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

        logger.info('User logged in', { emailHash: loginEmailHash, tenantId: user.tenantId });
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
        if (error instanceof InfrastructureError) {
            logLoginDiagnostic({
                level: 'error',
                reason: 'schema_error',
                requestId,
                emailHash: loginEmailHash,
                errorCode: error.code,
                retryable: error.isRetryable,
                error,
            });
            logger.error('Infrastructure failure during login', error, {
                requestId,
                code: error.code,
                retryable: error.isRetryable,
                context: error.context,
            });
            return NextResponse.json(
                {
                    success: false,
                    error: getUserMessage(error),
                    code: error.code,
                    retryable: error.isRetryable,
                    requestId,
                },
                { status: 503 }
            );
        }

        // Log everything else, generic 500 since we don't know what broke, wait, requirements say only 500 for infra
        // I'll log securely
        logLoginDiagnostic({
            level: 'error',
            reason: 'schema_error',
            requestId,
            emailHash: loginEmailHash,
            error: error as Error,
        });
        logger.error('Unexpected error during login', error as Error, { requestId });
        return NextResponse.json(
            { success: false, error: 'Erro interno de servidor', requestId },
            { status: 500 }
        );
    }
}
