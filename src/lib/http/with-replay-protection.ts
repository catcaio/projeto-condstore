import { NextRequest, NextResponse } from 'next/server';
import { validateReplayProtection } from '../security/replay-protection';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerWrapper = (req: NextRequest, ctx: any) => Promise<Response>;

/**
 * Wraps a Next.js route handler with replay attack protection.
 *
 * Validates `x-request-timestamp` (±60s) and `x-request-nonce` (unique via Redis)
 * before delegating to the underlying handler.
 *
 * Intended composition: `withReplayProtection(withIdempotency(handler))`
 */
export function withReplayProtection(handler: HandlerWrapper): HandlerWrapper {
    return async (req: NextRequest, ctx?: any): Promise<Response> => {
        const result = await validateReplayProtection(req);

        if (!result.ok && result.response) {
            return result.response;
        }

        return handler(req, ctx);
    };
}
