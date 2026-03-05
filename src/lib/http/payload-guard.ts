import { NextRequest } from 'next/server';
import { structuredLogger } from '../../infra/log/logger';

export interface PayloadGuardOptions {
    maxBytes?: number;
    requiredContentType?: string;
}

const DEFAULT_LIMITS: Record<string, number> = {
    '/api/public': 1024 * 1024, // 1MB
    '/api/cockpit': 2 * 1024 * 1024, // 2MB
    '/api/tenants': 2 * 1024 * 1024, // 2MB
    '/api/internal': 5 * 1024 * 1024, // 5MB
    '/api/admin': 2 * 1024 * 1024, // 2MB
};

function getDefaultLimit(path: string): number {
    for (const [prefix, limit] of Object.entries(DEFAULT_LIMITS)) {
        if (path.startsWith(prefix)) return limit;
    }
    return 1024 * 1024; // Default safe fallback: 1MB
}

/**
 * Validates Content-Type, enforces a strict payload size limit, and safely parses JSON.
 * Returns Response objects for early termination (415, 413, 400) or the parsed parsed JSON payload via an explicit boolean flag object.
 */
export async function parseJsonWithLimit(req: NextRequest, options: PayloadGuardOptions = {}): Promise<{ errorResponse?: Response; parsedPayload?: any }> {
    const requiredContentType = options.requiredContentType ?? 'application/json';
    const contentType = req.headers.get('content-type') || '';

    const requestId = req.headers.get('x-request-id') || 'unknown';
    const route = req.nextUrl.pathname;

    // 1. Content-Type Enforcement
    if (!contentType.includes(requiredContentType)) {
        structuredLogger.warn('payload_guard_blocked', {
            eventType: 'security_event',
            error_type: 'unsupported_content_type',
            route,
            requestId,
            receivedContentType: contentType
        });
        return {
            errorResponse: new Response(JSON.stringify({ error: 'Unsupported Media Type' }), { status: 415, headers: { 'Content-Type': 'application/json' } })
        };
    }

    const contentLengthStr = req.headers.get('content-length');
    let contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
    const maxBytes = options.maxBytes ?? getDefaultLimit(route);

    // 2. Head-of-Line Size Check (if Content-Length is provided)
    if (contentLength > maxBytes) {
        structuredLogger.warn('payload_guard_blocked', {
            eventType: 'security_event',
            error_type: 'payload_too_large',
            route,
            requestId,
            size: contentLength,
            limit: maxBytes
        });
        return {
            errorResponse: new Response(JSON.stringify({ error: 'Payload Too Large' }), { status: 413, headers: { 'Content-Type': 'application/json' } })
        };
    }

    // 3. Stream reader with explicit byte limit (protects against missing/forged Content-Length)
    try {
        const bodyBuffer = await req.arrayBuffer();

        if (bodyBuffer.byteLength > maxBytes) {
            structuredLogger.warn('payload_guard_blocked', {
                eventType: 'security_event',
                error_type: 'payload_too_large_stream',
                route,
                requestId,
                size: bodyBuffer.byteLength,
                limit: maxBytes
            });
            return {
                errorResponse: new Response(JSON.stringify({ error: 'Payload Too Large' }), { status: 413, headers: { 'Content-Type': 'application/json' } })
            };
        }

        const textDecoder = new TextDecoder('utf-8');
        const bodyText = textDecoder.decode(bodyBuffer);

        if (!bodyText.trim()) {
            return { parsedPayload: {} }; // Empty body parses to empty object if JSON is allowed to be empty, or let JSON.parse fail
        }

        const parsedPayload = JSON.parse(bodyText);
        return { parsedPayload };
    } catch (err: any) {
        structuredLogger.warn('payload_guard_blocked', {
            eventType: 'security_event',
            error_type: 'invalid_json',
            route,
            requestId
        });
        return {
            errorResponse: new Response(JSON.stringify({ error: 'Bad Request - Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        };
    }
}
