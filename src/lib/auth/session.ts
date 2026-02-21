import { cookies } from 'next/headers';

export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
}
