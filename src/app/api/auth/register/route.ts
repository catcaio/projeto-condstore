import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '../../../../lib/auth/userStore';
import { hashPassword } from '../../../../lib/auth/hash';
import { sign } from '../../../../lib/auth/jwt';
import { setAuthCookie } from '../../../../lib/auth/session';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const existingUser = await findUserByEmail(email.toLowerCase());
        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        const hashedPassword = hashPassword(password);
        const userId = crypto.randomUUID();

        const user = await createUser(userId, email.toLowerCase(), hashedPassword);

        const token = sign({ userId: user.id });
        await setAuthCookie(token);

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
