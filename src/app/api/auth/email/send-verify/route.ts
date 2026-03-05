export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { eq } from 'drizzle-orm';

const sendVerifySchema = z.object({
    email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = sendVerifySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Email inválido' },
                { status: 400 }
            );
        }

        const normalizedEmail = validation.data.email.toLowerCase().trim();
        const db = await getDb();

        const results = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            ;

        const user = results[0];
        if (!user) {
            // Don't reveal whether email exists
            return NextResponse.json({ success: true });
        }

        if (user.emailVerifiedAt) {
            return NextResponse.json({ success: true, message: 'Email já verificado' });
        }

        // Generate new token
        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        await db.update(users).set({ emailVerifyToken }).where(eq(users.id, user.id));

        const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const verifyUrl = `${baseUrl}/api/auth/email/verify?token=${emailVerifyToken}`;

        if (process.env.NODE_ENV !== 'production') {
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
                        html: `<p>Olá ${user.name || ''},</p><p>Clique no link abaixo para verificar seu email:</p><p><a href="${verifyUrl}">Verificar email</a></p>`,
                    }),
                });
            } catch (err) {
                structuredLogger.error('email_verify_resend_failed', {
                    eventType: 'email_verify',
                    userId: user.id,
                    error: err,
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        structuredLogger.error('send_verify_error', {
            eventType: 'email_verify',
            error,
        });
        return NextResponse.json(
            { success: false, error: 'Erro interno' },
            { status: 500 }
        );
    }
}
