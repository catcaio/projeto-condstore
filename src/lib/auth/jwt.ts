// Removed Node crypto require for Edge compatibility
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

async function getCryptoKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
        'raw',
        encoder.encode(getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

// Convert ArrayBuffer to Base64URL
function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function sign(payload: Record<string, any>): Promise<string> {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${header}.${body}`;

    const key = await getCryptoKey();
    const encoder = new TextEncoder();

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(dataToSign)
    );

    const signature = bufferToBase64Url(signatureBuffer);
    return `${dataToSign}.${signature}`;
}

export async function verify(token: string): Promise<Record<string, any> | null> {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const dataToVerify = `${header}.${body}`;

    try {
        const key = await getCryptoKey();
        const encoder = new TextEncoder();

        // Convert Base64Url signature back to Uint8Array for verification
        let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';

        const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            sigBytes,
            encoder.encode(dataToVerify)
        );

        if (!isValid) return null;

        return JSON.parse(base64UrlDecode(body));
    } catch (e) {
        return null;
    }
}
