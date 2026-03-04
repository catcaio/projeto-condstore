export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/infra/db';
import { users, invites, tenantSignupPolicies } from '@/drizzle/schema';
import { hashPassword } from '@/infra/auth/password';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { isRole } from '@/infra/auth/roles';
import { structuredLogger } from '@/infra/log/logger';
import { eq, and, isNull } from 'drizzle-orm';

const signupSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório').max(255),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').optional(),
    roleRequested: z.enum(['viewer', 'operator', 'manager', 'admin']),
    inviteToken: z.string().optional(),
    provider: z.enum(['email', 'google']).optional().default('email'),
});

const PRIVILEGED_ROLES = new Set(['manager', 'admin']);
const ADMIN_EMAILS = (process.env.CONDSTORE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_DOMAINS = (process.env.CONDSTORE_ADMIN_DOMAINS || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

function isAdminAllowlisted(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(normalizedEmail)) return true;
    const domain = normalizedEmail.split('@')[1];
    return domain ? ADMIN_DOMAINS.includes(domain) : false;
}

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID?.() ?? `${Date.now()}`;

    try {
        const body = await request.json();
        const validation = signupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0]?.message || 'Dados inválidos' },
                { status: 400 }
            );
        }

        const { name, email, password, roleRequested, inviteToken, provider } = validation.data;
        const normalizedEmail = email.trim().toLowerCase();

        if (provider === 'email' && !password) {
            return NextResponse.json(
                { success: false, error: 'Senha obrigatória para cadastro por email' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // ── 1. Check if user already exists ───────────────────────────────
        const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Já existe uma conta com este email' },
                { status: 409 }
            );
        }

        // ── 2. Resolve tenant + validate role ─────────────────────────────
        let tenantId: string | null = null;
        let resolvedRole = roleRequested;

        // 2a. Try invite token
        if (inviteToken) {
            const inviteRows = await db
                .select()
                .from(invites)
                .where(and(eq(invites.token, inviteToken), isNull(invites.usedAt)))
                .limit(1);

            const invite = inviteRows[0];
            if (!invite) {
                return NextResponse.json(
                    { success: false, error: 'Token de convite inválido ou já usado' },
                    { status: 400 }
                );
            }

            if (invite.expiresAt < new Date()) {
                return NextResponse.json(
                    { success: false, error: 'Token de convite expirado' },
                    { status: 400 }
                );
            }

            if (invite.email && invite.email.toLowerCase() !== normalizedEmail) {
                return NextResponse.json(
                    { success: false, error: 'Este convite é para outro email' },
                    { status: 400 }
                );
            }

            tenantId = invite.tenantId;
            resolvedRole = invite.role as typeof roleRequested;

            // Mark invite as used
            await db.update(invites).set({ usedAt: new Date() }).where(eq(invites.id, invite.id));
        }

        // 2b. Try domain-based tenant resolution
        if (!tenantId) {
            const emailDomain = normalizedEmail.split('@')[1];
            if (emailDomain) {
                const policies = await db.select().from(tenantSignupPolicies);
                for (const policy of policies) {
                    const domains = (policy.allowedDomains as string[]) || [];
                    if (domains.includes(emailDomain)) {
                        tenantId = policy.tenantId;
                        break;
                    }
                    const emails = (policy.allowedEmails as string[]) || [];
                    if (emails.includes(normalizedEmail)) {
                        tenantId = policy.tenantId;
                        break;
                    }
                }
            }
        }

        if (!tenantId) {
            return NextResponse.json(
                { success: false, error: 'Não foi possível encontrar uma organização. Solicite um convite ao administrador.' },
                { status: 400 }
            );
        }

        // 2c. Validate privileged role access
        if (PRIVILEGED_ROLES.has(resolvedRole) && !inviteToken && !isAdminAllowlisted(normalizedEmail)) {
            return NextResponse.json(
                { success: false, error: 'Gerente e Administrador requerem token de convite' },
                { status: 403 }
            );
        }

        // 2d. Check self-signup policy for non-invited users
        if (!inviteToken) {
            const policyRows = await db
                .select()
                .from(tenantSignupPolicies)
                .where(eq(tenantSignupPolicies.tenantId, tenantId))
                .limit(1);

            const policy = policyRows[0];
            if (!policy?.selfSignupEnabled) {
                return NextResponse.json(
                    { success: false, error: 'Cadastro livre não está habilitado. Solicite um convite.' },
                    { status: 403 }
                );
            }
        }

        // ── 3. Create user ────────────────────────────────────────────────
        const userId = crypto.randomUUID();
        const passwordHash = password ? hashPassword(password) : null;
        const emailVerifyToken = crypto.randomBytes(32).toString('hex');

        await db.insert(users).values({
            id: userId,
            email: normalizedEmail,
            name,
            passwordHash,
            authProvider: provider,
            tenantId,
            role: resolvedRole,
            emailVerifyToken,
            sessionVersion: 1,
        });

        structuredLogger.info('user_signup', {
            eventType: 'auth_signup',
            userId,
            tenantId,
            role: resolvedRole,
            provider,
            requestId,
        });

        // ── 4. Send email verification ────────────────────────────────────
<<<<<<< HEAD
        const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const verifyUrl = `${baseUrl}/api/auth/email/verify?token=${emailVerifyToken}`;
=======
        const verifyUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/auth/email/verify?token=${emailVerifyToken}`;
>>>>>>> origin/main

        if (process.env.NODE_ENV !== 'production') {
            structuredLogger.info('email_verify_link_dev', {
                eventType: 'email_verify',
                userId,
                verifyUrl,
            });
            console.log(`\n📧 Email verify link (dev): ${verifyUrl}\n`);
        } else if (process.env.RESEND_API_KEY) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM || 'noreply@condstore.com',
                        to: normalizedEmail,
                        subject: 'Verifique seu email — CondStore OS',
                        html: `<p>Olá ${name},</p><p>Clique no link abaixo para verificar seu email:</p><p><a href="${verifyUrl}">Verificar email</a></p><p>Este link expira em 24 horas.</p>`,
                    }),
                });
            } catch (err) {
                structuredLogger.error('email_verify_send_failed', {
                    eventType: 'email_verify',
                    userId,
                    error: err,
                });
            }
        }

        // ── 5. Create session ─────────────────────────────────────────────
        const token = await createSessionToken({
            id: userId,
            email: normalizedEmail,
            tenantId,
            role: resolvedRole,
            sessionVersion: 1,
        });

        const response = NextResponse.json({
            success: true,
            emailVerifyRequired: true,
            user: { email: normalizedEmail, role: resolvedRole, name },
        }, { status: 201 });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60,
        });

        return response;
    } catch (error) {
        structuredLogger.error('signup_error', {
            eventType: 'auth_signup',
            requestId,
            error,
        });
        return NextResponse.json(
            { success: false, error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        );
    }
}
