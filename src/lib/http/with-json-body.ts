import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseJsonWithLimit, PayloadGuardOptions } from './payload-guard';
import { validateBody } from './validate-schema';

type HandlerWithBody<T> = (
    req: NextRequest,
    ctx: any,
    body: T
) => Promise<Response>;

export interface JsonBodyOptions<T> extends PayloadGuardOptions {
    schema: z.ZodType<T>;
}

/**
 * HOF that acts as a secure JSON Payload Guard and Schema Validator.
 * Handles Payload Too Large (413), Invalid Content-Type (415), Invalid JSON (400), and Schema Mismatches (422) automatically.
 * Injects the strictly typed schema result into the core Handler as the 3rd argument.
 */
export function withJsonBody<T>(options: JsonBodyOptions<T>, handler: HandlerWithBody<T>) {
    return async function wrappedHandler(req: NextRequest, ctx: any): Promise<Response> {
        // 1. Enforce size and JSON structure
        const { errorResponse: guardError, parsedPayload } = await parseJsonWithLimit(req, options);
        if (guardError) return guardError;

        // 2. Validate against explicit Zod schema
        const { errorResponse: schemaError, validPayload } = validateBody(req, options.schema, parsedPayload);
        if (schemaError) return schemaError;

        // 3. Proceed to handler with strict typed body
        return handler(req, ctx, validPayload as T);
    };
}
