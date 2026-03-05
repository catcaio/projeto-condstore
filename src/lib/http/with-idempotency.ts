import { NextRequest, NextResponse } from 'next/server';
import { checkIdempotencyKey, saveIdempotentResponse } from '../security/idempotency';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerWrapper = (req: NextRequest, ctx: any) => Promise<NextResponse>;

/**
 * Wraps a Next.js App Router API handler (`POST`, `PUT`, `PATCH`, `DELETE`) with idempotency guarantees.
 * 
 * If the `Idempotency-Key` header is perfectly matched for the calculated route, 
 * this wrapper returns the previously mapped `responseBody` and `responseStatus`
 * rather than executing the underlying `handler`.
 */
export function withIdempotency(handler: HandlerWrapper): HandlerWrapper {
    return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
        // 1. Calculate the normalized route for uniqueness mapping
        const route = req.nextUrl?.pathname || new URL(req.url || '', 'http://localhost').pathname;
        const tenantId = typeof ctx?.params?.tenantId === 'string' ? ctx.params.tenantId : undefined;

        // 2. Intercept via Idempotency Layer
        const checkResult = await checkIdempotencyKey(req, route, tenantId);

        if (checkResult.isCached && checkResult.cachedResponse) {
            // Already cached or conflicting in-progress
            return checkResult.cachedResponse;
        }

        // 3. Execute the standard handler logic
        const response = await handler(req, ctx);

        // 4. Save the result if this was tracked as the original idempotency transaction
        if (checkResult.idempotencyKey) {
            try {
                // Clone the response to safely read its body text without locking the stream for the client
                const clone = response.clone();
                const bodyText = await clone.text();

                let parsedBody = null;
                if (bodyText) {
                    try {
                        parsedBody = JSON.parse(bodyText);
                    } catch {
                        parsedBody = { text: bodyText }; // Fallback for non-JSON responses
                    }
                }

                // Fire and forget updating the pending record
                // (req.waitUntil is supported natively in App Router to defer lifecycle completion)
                // Note: waitUntil is technically available on the Event object natively, but we can standard await in Node depending on environment.
                saveIdempotentResponse(
                    checkResult.idempotencyKey,
                    route,
                    response.status,
                    parsedBody
                ).catch(() => { });
            } catch (err) {
                // Ignore parse errors on telemetry
            }
        }

        return response;
    };
}
