import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '../../infra/redis.client';
import { structuredLogger as logger } from '../../infra/log/logger';

const TIMESTAMP_WINDOW_SECONDS = 60;
const NONCE_TTL_SECONDS = 60;

export interface ReplayValidationResult {
    ok: boolean;
    response?: NextResponse;
}

/**
 * Validates replay protection headers (`x-request-timestamp` and `x-request-nonce`).
 *
 * - Timestamp must be within ±60s of server time.
 * - Nonce must be unique (checked atomically via Redis SETNX with 60s TTL).
 */
export function validateReplayProtection(req: NextRequest): Promise<ReplayValidationResult> {
    return _validate(req);
}

async function _validate(req: NextRequest): Promise<ReplayValidationResult> {
    const timestampHeader = req.headers.get('x-request-timestamp');
    const nonce = req.headers.get('x-request-nonce');

    // 1. Headers must be present
    if (!timestampHeader || !nonce) {
        logger.warn('replay_headers_missing', {
            route: req.nextUrl?.pathname || req.url,
            hasTimestamp: !!timestampHeader,
            hasNonce: !!nonce,
        });
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Missing required security headers: x-request-timestamp, x-request-nonce' },
                { status: 401 }
            ),
        };
    }

    // 2. Validate timestamp within ±60s window
    const requestTimestamp = Number(timestampHeader);
    if (isNaN(requestTimestamp)) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Invalid x-request-timestamp: must be a Unix epoch in seconds' },
                { status: 401 }
            ),
        };
    }

    const serverTimestamp = Math.floor(Date.now() / 1000);
    const drift = Math.abs(serverTimestamp - requestTimestamp);

    if (drift > TIMESTAMP_WINDOW_SECONDS) {
        logger.warn('replay_timestamp_expired', {
            route: req.nextUrl?.pathname || req.url,
            drift,
            serverTimestamp,
            requestTimestamp,
        });
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Request timestamp expired or too far in the future' },
                { status: 401 }
            ),
        };
    }

    // 3. Check nonce uniqueness via Redis SETNX
    const nonceKey = `nonce:${nonce}`;
    const isNew = await redisClient.setNx(nonceKey, true, NONCE_TTL_SECONDS);

    if (!isNew) {
        logger.warn('replay_detected', {
            route: req.nextUrl?.pathname || req.url,
            nonce,
        });
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Replay detected: this nonce has already been used' },
                { status: 409 }
            ),
        };
    }

    return { ok: true };
}
