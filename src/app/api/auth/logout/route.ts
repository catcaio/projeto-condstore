import { NextResponse } from 'next/server';
import { clearAuthCookie } from '../../../../lib/auth/session';

export async function POST() {
    try {
        await clearAuthCookie();
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
