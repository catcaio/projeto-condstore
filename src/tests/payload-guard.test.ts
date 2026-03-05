import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseJsonWithLimit } from '../lib/http/payload-guard';
import { validateBody } from '../lib/http/validate-schema';
import { withJsonBody } from '../lib/http/with-json-body';

// Mock logger to avoid test noise
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

function createMockRequest(body: string, contentType: string = 'application/json', pathname: string = '/api/internal/test'): NextRequest {
    const encoder = new TextEncoder();
    const bodyBuffer = encoder.encode(body);
    return {
        headers: new Headers({
            'content-type': contentType,
            'content-length': bodyBuffer.length.toString(),
            'x-request-id': 'test-req-id'
        }),
        nextUrl: { pathname },
        arrayBuffer: async () => bodyBuffer.buffer,
    } as unknown as NextRequest;
}

describe('Payload Guard & Schema Enforcement', () => {

    describe('parseJsonWithLimit (Payload Guard)', () => {
        it('rejects invalid content-type with 415', async () => {
            const req = createMockRequest('{"a":1}', 'text/plain');
            const { errorResponse } = await parseJsonWithLimit(req);
            expect(errorResponse).toBeDefined();
            expect(errorResponse?.status).toBe(415);
        });

        it('rejects oversized payload (via header limit) with 413', async () => {
            const req = createMockRequest('{"a":1}');
            req.headers.set('content-length', '9999999'); // Exceeds default 1MB limits
            const { errorResponse } = await parseJsonWithLimit(req, { maxBytes: 100 });
            expect(errorResponse).toBeDefined();
            expect(errorResponse?.status).toBe(413);
        });

        it('rejects oversized payload (via buffer stream actual size) with 413', async () => {
            const largeBody = '{"data":"' + 'A'.repeat(500) + '"}';
            const req = createMockRequest(largeBody);
            req.headers.delete('content-length'); // missing header, force stream check
            const { errorResponse } = await parseJsonWithLimit(req, { maxBytes: 100 });
            expect(errorResponse).toBeDefined();
            expect(errorResponse?.status).toBe(413);
        });

        it('rejects invalid JSON with 400', async () => {
            const req = createMockRequest('{ "broken_json": true, }');
            const { errorResponse } = await parseJsonWithLimit(req);
            expect(errorResponse).toBeDefined();
            expect(errorResponse?.status).toBe(400);
        });

        it('parses valid JSON accurately', async () => {
            const req = createMockRequest('{"success":true}');
            const { errorResponse, parsedPayload } = await parseJsonWithLimit(req);
            expect(errorResponse).toBeUndefined();
            expect(parsedPayload).toEqual({ success: true });
        });
    });

    describe('validateBody (Schema Validation)', () => {
        const testSchema = z.object({ value: z.number() });

        it('returns 422 for mismatched schema', async () => {
            const req = createMockRequest('');
            const { errorResponse } = validateBody(req, testSchema, { value: "not a number" });
            expect(errorResponse).toBeDefined();
            expect(errorResponse?.status).toBe(422);
            const json = await errorResponse?.json();
            expect(json.error).toContain('Schema Validation Failed');
            expect(json.details[0].path).toBe('value');
        });

        it('returns typed valid payload for matched schema', async () => {
            const req = createMockRequest('');
            const { errorResponse, validPayload } = validateBody(req, testSchema, { value: 42 });
            expect(errorResponse).toBeUndefined();
            expect(validPayload).toEqual({ value: 42 });
        });
    });

    describe('withJsonBody (Wrapper)', () => {
        const testSchema = z.object({ name: z.string() });
        const mockHandler = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));
        const wrapped = withJsonBody({ schema: testSchema }, mockHandler);

        it('blocks bad routing early (415)', async () => {
            const req = createMockRequest('{"name":"Bob"}', 'text/html');
            const res = await wrapped(req, {});
            expect(res.status).toBe(415);
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('blocks invalid JSON early (400)', async () => {
            const req = createMockRequest('{"name:"Bob"}'); // syntax error
            const res = await wrapped(req, {});
            expect(res.status).toBe(400);
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('blocks invalid schema early (422)', async () => {
            const req = createMockRequest('{"name":123}'); // string expected
            const res = await wrapped(req, {});
            expect(res.status).toBe(422);
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('passes successful typed payload to handler', async () => {
            const req = createMockRequest('{"name":"Alice"}');
            const res = await wrapped(req, { params: { id: '1' } });
            expect(res.status).toBe(200);
            expect(mockHandler).toHaveBeenCalledWith(req, { params: { id: '1' } }, { name: 'Alice' });
        });
    });

});
