import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withIdempotency } from '../with-idempotency';
import { checkIdempotencyKey, saveIdempotentResponse } from '../../security/idempotency';

// Mock the idempotency security layer
vi.mock('../../security/idempotency', () => ({
    checkIdempotencyKey: vi.fn(),
    saveIdempotentResponse: vi.fn()
}));

describe('withIdempotency', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should bypass idempotency logic if checkResult says it is not cached and no key is provided', async () => {
        const mockHandler = vi.fn().mockResolvedValue(new Response('OK'));
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
        });

        const res = await wrappedHandler(req, {});

        expect(checkIdempotencyKey).toHaveBeenCalledWith(req, '/api/test', undefined);
        expect(mockHandler).toHaveBeenCalledWith(req, {});
        expect(await res.text()).toBe('OK');
        expect(saveIdempotentResponse).not.toHaveBeenCalled();
    });

    it('should return cached response without calling handler if isCached is true', async () => {
        const mockHandler = vi.fn();
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');
        const cachedResponse = new Response('Cached', { status: 200 });

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: true,
            cachedResponse
        });

        const res = await wrappedHandler(req, {});

        expect(checkIdempotencyKey).toHaveBeenCalledWith(req, '/api/test', undefined);
        expect(mockHandler).not.toHaveBeenCalled();
        expect(await res.text()).toBe('Cached');
    });

    it('should execute handler and save idempotent response with parsed JSON when not cached but key is present', async () => {
        const jsonBody = { success: true };
        const mockResponse = new Response(JSON.stringify(jsonBody), { status: 201 });
        const mockHandler = vi.fn().mockResolvedValue(mockResponse);
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');
        const ctx = { params: { tenantId: 'tenant-123' } };

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
            idempotencyKey: 'test-key'
        });
        vi.mocked(saveIdempotentResponse).mockResolvedValue();

        const res = await wrappedHandler(req, ctx);

        expect(checkIdempotencyKey).toHaveBeenCalledWith(req, '/api/test', 'tenant-123');
        expect(mockHandler).toHaveBeenCalledWith(req, ctx);

        // Ensure response is returned intact
        expect(await res.json()).toEqual(jsonBody);

        // Wait a tick for the "fire and forget" save promise to get queued and run
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(saveIdempotentResponse).toHaveBeenCalledWith('test-key', '/api/test', 201, jsonBody);
    });

    it('should execute handler and save idempotent response with text fallback when response is not valid JSON', async () => {
        const mockResponse = new Response('Plain text result', { status: 200 });
        const mockHandler = vi.fn().mockResolvedValue(mockResponse);
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
            idempotencyKey: 'test-key-text'
        });
        vi.mocked(saveIdempotentResponse).mockResolvedValue();

        const res = await wrappedHandler(req);

        expect(mockHandler).toHaveBeenCalledWith(req, undefined);
        expect(await res.text()).toBe('Plain text result');

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(saveIdempotentResponse).toHaveBeenCalledWith(
            'test-key-text',
            '/api/test',
            200,
            { text: 'Plain text result' }
        );
    });

    it('should handle empty responses gracefully without parsing errors', async () => {
        const mockResponse = new Response(null, { status: 204 });
        const mockHandler = vi.fn().mockResolvedValue(mockResponse);
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
            idempotencyKey: 'test-key-empty'
        });
        vi.mocked(saveIdempotentResponse).mockResolvedValue();

        const res = await wrappedHandler(req);

        expect(res.status).toBe(204);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(saveIdempotentResponse).toHaveBeenCalledWith(
            'test-key-empty',
            '/api/test',
            204,
            null
        );
    });
    it('should fallback to URL constructor when req.nextUrl is undefined', async () => {
        const mockHandler = vi.fn().mockResolvedValue(new Response('OK'));
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/fallback');
        // Force nextUrl to be undefined to hit the fallback
        Object.defineProperty(req, 'nextUrl', { value: undefined });

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
        });

        await wrappedHandler(req, {});

        expect(checkIdempotencyKey).toHaveBeenCalledWith(req, '/api/fallback', undefined);
    });

    it('should ignore errors during response parsing or stream cloning', async () => {
        const mockResponse = new Response('some body');
        // Force clone to throw an error
        mockResponse.clone = () => { throw new Error('Stream error'); };

        const mockHandler = vi.fn().mockResolvedValue(mockResponse);
        const wrappedHandler = withIdempotency(mockHandler);

        const req = new NextRequest('http://localhost/api/test');

        vi.mocked(checkIdempotencyKey).mockResolvedValue({
            isCached: false,
            idempotencyKey: 'test-key-error'
        });

        const res = await wrappedHandler(req);

        // It should still return the response normally
        expect(res).toBe(mockResponse);
        // It shouldn't crash, but saveIdempotentResponse should NOT have been reached because it threw in clone()
        expect(saveIdempotentResponse).not.toHaveBeenCalledWith("test-key-error", expect.anything(), expect.anything(), expect.anything());
    });

});
