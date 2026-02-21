import { cookies } from 'next/headers';

export async function setAdminCookie() {
    const cookieStore = await cookies();
    cookieStore.set('admin', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400, // 1 day
    });
}

export async function clearAdminCookie() {
    const cookieStore = await cookies();
    cookieStore.set('admin', '0', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400,
    });
}
