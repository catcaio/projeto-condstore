/**
 * Melhor Envio Authentication Module
 * 
 * Handles the OAuth client_credentials grant type to fetch a token securely
 * and caches it in memory to avoid excessive calls.
 */

import { logger } from '../../../infra/logger';

interface TokenCache {
    accessToken: string;
    expiresAt: number; // timestamp in ms
}

let cache: TokenCache | null = null;

const ME_OAUTH_URL = 'https://sandbox.melhorenvio.com.br/oauth/token';

export async function getMelhorEnvioAccessToken(): Promise<string> {
    const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
    const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('MELHOR_ENVIO_CLIENT_ID or MELHOR_ENVIO_CLIENT_SECRET not configured');
    }

    // Check cache (allow 5 minute buffer before expiry)
    if (cache && cache.expiresAt > Date.now() + 5 * 60 * 1000) {
        return cache.accessToken;
    }

    try {
        const payload = {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        };

        const res = await fetch(ME_OAUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'CondStore/1.0',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const errorRaw = await res.text().catch(() => '');
            const err = new Error(`Melhor Envio OAuth failed: ${res.status}`);
            (err as any).details = errorRaw;
            logger.error('melhor_envio_auth: API returned non-200', err);
            throw err;
        }

        const data: any = await res.json();

        if (!data.access_token) {
            throw new Error('OAuth payload did not contain access_token');
        }

        // Token usually valid for 1 hour. We cache for 55 minutes to be safe.
        // If expires_in is given, we use it, otherwise fallback to 55m.
        const expiresInSecs = data.expires_in ? parseInt(data.expires_in) : 3600;
        const cacheForMs = Math.min(expiresInSecs * 1000, 55 * 60 * 1000);

        cache = {
            accessToken: data.access_token,
            expiresAt: Date.now() + cacheForMs,
        };

        logger.info('melhor_envio_auth: obtained new access token');

        return cache.accessToken;
    } catch (err) {
        logger.error('melhor_envio_auth: failed to fetch token', err instanceof Error ? err : undefined);
        throw err;
    }
}
