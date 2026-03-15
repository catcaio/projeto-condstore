import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '../logger';
import { userRepository } from '../repositories/user.repository';
import { isDevRuntime, isQaAutomation } from '../env/devOnly';

export const COOKIE_NAME = 'condstore_session';
const TOKEN_EXPIRY = '8h';

export interface SessionPayload {
    sub: string;       // user.id
    email: string;
    tenantId: string;
    role: string;
    sv: number;
}

export function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('AUTH_SECRET is not set in production');
        }
        logger.warn('AUTH_SECRET not set, using dev fallback -- sessions will not survive restarts');
        return new TextEncoder().encode('dev-only-fallback-secret-do-not-use-in-prod');
    }
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    sessionVersion: number;
}): Promise<string> {
    return new SignJWT({ email: user.email, tenantId: user.tenantId, role: user.role, sv: user.sessionVersion })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            sub: payload.sub as string,
            email: payload.email as string,
            tenantId: payload.tenantId as string,
            role: payload.role as string,
            sv: payload.sv as number,
        };
    } catch {
        return null;
    }
}

export async function getSessionUser(request: NextRequest): Promise<SessionPayload | null> {
    if (!request) return getServerSessionUser();
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    try {
        if (payload.sub === 'mock-admin' && (isDevRuntime() || isQaAutomation())) {
            return payload; // Dev session bootstrap without DB
        }
        const user = await userRepository.getUserById(payload.sub);
        if (!user || user.sessionVersion !== payload.sv) {
            return null; // Session invalidated or user deleted
        }
        return payload;
    } catch (error) {
        logger.error('Failed to validate session user', error as Error, { userId: payload.sub });
        return null;
    }
}

export async function getServerSessionUser(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    try {
        if (payload.sub === 'mock-admin' && (isDevRuntime() || isQaAutomation())) {
            return payload;
        }
        const user = await userRepository.getUserById(payload.sub);
        if (!user || user.sessionVersion !== payload.sv) {
            return null;
        }
        return payload;
    } catch (error) {
        logger.error('Failed to validate server session user', error as Error, { userId: payload.sub });
        return null;
    }
}
// Trigger cache invalidation
