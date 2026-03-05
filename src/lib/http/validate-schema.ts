import { z } from 'zod';
import { structuredLogger } from '../../infra/log/logger';
import { NextRequest } from 'next/server';

export interface SchemaValidationResult<T> {
    errorResponse?: Response;
    validPayload?: T;
}

/**
 * Validates a payload against a Zod schema.
 * Rejects with a 422 Unprocessable Entity and logs securely (without PII/raw data) if parsing fails.
 */
export function validateBody<T>(req: NextRequest, schema: z.ZodType<T>, data: any): SchemaValidationResult<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
        const route = req.nextUrl.pathname;
        const requestId = req.headers.get('x-request-id') || 'unknown';

        structuredLogger.warn('schema_validation_failed', {
            eventType: 'security_event',
            error_type: 'schema_invalid',
            route,
            requestId,
            issues: result.error.issues.map((e: z.ZodIssue) => ({ path: e.path.join('.'), message: e.message })) // Only log paths and generic messages, not the raw input values
        });

        return {
            errorResponse: new Response(JSON.stringify({
                error: 'Unprocessable Entity - Schema Validation Failed',
                details: result.error.issues.map((e: z.ZodIssue) => ({ path: e.path.join('.'), message: e.message }))
            }), { status: 422, headers: { 'Content-Type': 'application/json' } })
        };
    }

    return {
        validPayload: result.data
    };
}
