import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '../../../../lib/auth/userStore';
import { verifyPassword } from '../../../../lib/auth/hash';
import { sign } from '../../../../lib/auth/jwt';
import { setAuthCookie } from '../../../../lib/auth/session';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await findUserByEmail(email.toLowerCase());
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = sign({ userId: user.id });
        await setAuthCookie(token);

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
