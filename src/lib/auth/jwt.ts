import crypto from 'crypto';

const getSecret = () => process.env.AUTH_SECRET || 'default-secret-do-not-use-in-prod';

function base64UrlEncode(str: string): string {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
    let padding = '='.repeat((4 - (str.length % 4)) % 4);
    let base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
}

export function sign(payload: Record<string, any>): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
        .createHmac('sha256', getSecret())
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `${header}.${body}.${signature}`;
}

export function verify(token: string): Record<string, any> | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
        .createHmac('sha256', getSecret())
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    if (signature !== expectedSignature) return null;

    try {
        return JSON.parse(base64UrlDecode(body));
    } catch {
        return null;
    }
}
