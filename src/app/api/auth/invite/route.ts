export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/infra/db';
import { users, invites } from '@/drizzle/schema';
import { getServerSessionUser } from '@/infra/auth/session';
import { getPublicAppUrl } from '@/infra/env/critical-runtime';
import { structuredLogger } from '@/infra/log/logger';
import { eq, and, isNull } from 'drizzle-orm';
import { withAuditLog } from '@/lib/http/with-audit-log';
import { withJsonBody } from '@/lib/http/with-json-body';

const inviteSchema = z.object({
    email: z.string().email('Email inválido').transform(e => e.trim().toLowerCase()),
    role: z.enum(['viewer', 'operator', 'manager', 'admin']),
});

export const POST = withAuditLog(
    { action: 'user_invite', scope: 'team', actorType: 'user' },
    withJsonBody(
        { schema: inviteSchema, maxBytes: 1024 * 1024 }, // 1MB limit
        async (request: NextRequest, ctx: any, body: z.infer<typeof inviteSchema>) => {
            const requestId = crypto.randomUUID?.() ?? `${Date.now()}`;

            try {
                const session = await getServerSessionUser();

                if (!session) {
                    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
                }

                // Only admins and managers can send invites
                if (session.role !== 'admin' && session.role !== 'manager') {
                    return NextResponse.json({ success: false, error: 'Acesso negado: Requer privilégio de gestão.' }, { status: 403 });
                }

                const { email, role } = body;

                // Managers cannot invite Admins (Role Hierarchy Check)
                if (session.role === 'manager' && role === 'admin') {
                    return NextResponse.json(
                        { success: false, error: 'Você não tem privilégio para convidar alguém com este cargo elevado.' },
                        { status: 403 }
                    );
                }

                const db = await getDb();

                // 1. Check if user already exists in the system
                const existingUsers = await db.select().from(users).where(eq(users.email, email));
                if (existingUsers.length > 0) {
                    const user = existingUsers[0];
                    if (user.tenantId === session.tenantId) {
                        return NextResponse.json(
                            { success: false, error: 'Usuário já faz parte desta organização.' },
                            { status: 409 }
                        );
                    } else {
                        return NextResponse.json(
                            { success: false, error: 'Este e-mail pertence a outro Workspace. O usuário deve usar um novo e-mail corporativo.' },
                            { status: 409 }
                        );
                    }
                }

                // 2. Check if a pending invite already exists
                const existingInvites = await db
                    .select()
                    .from(invites)
                    .where(
                        and(
                            eq(invites.tenantId, session.tenantId),
                            eq(invites.email, email),
                            isNull(invites.usedAt)
                        )
                    );

                if (existingInvites.length > 0) {
                    return NextResponse.json(
                        { success: false, error: 'Um convite pendente já foi enviado para este e-mail.' },
                        { status: 409 }
                    );
                }

                // 3. Create Invite
                const token = crypto.randomBytes(32).toString('hex');
                const inviteId = crypto.randomUUID();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

                await db.insert(invites).values({
                    id: inviteId,
                    tenantId: session.tenantId,
                    email,
                    role,
                    token,
                    expiresAt,
                    createdBy: session.sub,
                });

                structuredLogger.info('user_invited', {
                    eventType: 'team_management',
                    invitedEmail: email,
                    role,
                    tenantId: session.tenantId,
                    invitedBy: session.sub,
                    requestId,
                });

                // 4. Send Email (Mocked for Dev, Integrated with Resend in Prod)
                const baseUrl = getPublicAppUrl();
                const inviteUrl = `${baseUrl}/register?invite=${token}`;

                if (process.env.NODE_ENV !== 'production') {
                    structuredLogger.info('invite_link_dev', {
                        eventType: 'invite_link',
                        tenantId: session.tenantId,
                        inviteUrl,
                    });
                    structuredLogger.debug('invite_link_dev_hint', { eventType: 'invite_link', tenantId: session.tenantId, urlPrefix: inviteUrl.slice(0, 40) + '…' });
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
                                to: email,
                                subject: 'Convite para o CondStore OS',
                                html: `<p>Você foi convidado(a) para acessar o Workspace logístico. Clique no link abaixo e crie sua conta:</p><p><a href="${inviteUrl}">Aceitar Convite</a></p><p>Este link expira em 7 dias.</p>`,
                            }),
                        });
                    } catch (err) {
                        structuredLogger.error('invite_email_send_failed', {
                            eventType: 'email_invite',
                            inviteId,
                            error: err,
                        });
                    }
                }

                return NextResponse.json(
                    { success: true, message: 'Convite criado com sucesso!' },
                    { status: 201 }
                );

            } catch (error) {
                structuredLogger.error('invite_creation_error', {
                    eventType: 'team_management',
                    requestId,
                    error,
                });
                return NextResponse.json(
                    { success: false, error: 'Erro interno. Tente novamente.', devMsg: error instanceof Error ? error.message : String(error) },
                    { status: 500 }
                );
            }
        }
    )
);
