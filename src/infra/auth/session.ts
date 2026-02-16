import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'condstore_session';
const TOKEN_EXPIRY = '8h';

export interface SessionPayload {
    sub: string;       // user.id
    email: string;
    tenantId: string;
    role: string;
}

export function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET environment variable is required. Application cannot start without it.');
    }
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
}): Promise<string> {
    return new SignJWT({ email: user.email, tenantId: user.tenantId, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
        return {
            sub: payload.sub as string,
            email: payload.email as string,
            tenantId: payload.tenantId as string,
            role: payload.role as string,
        };
    } catch {
        return null;
    }
}

export async function getSessionUser(request: NextRequest): Promise<SessionPayload | null> {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
}
