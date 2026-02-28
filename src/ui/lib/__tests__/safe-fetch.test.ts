import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeFetch } from '../safe-fetch';

describe('safeFetch', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should return successfully on the first try if OK', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));
        global.fetch = fetchMock;

        const res = await safeFetch('http://localhost', { maxRetries: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(200);
    });

    it('should retry on 500 and eventually fail after maxRetries', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('Error', { status: 500 }));
        global.fetch = fetchMock;

        // Decrease backoff for faster tests
        const res = await safeFetch('http://localhost', { maxRetries: 3, baseBackoffMs: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
        expect(res.status).toBe(500);
    });

    it('should retry on 429 and eventually succeed', async () => {
        let calls = 0;
        const fetchMock = vi.fn().mockImplementation(() => {
            calls++;
            if (calls < 3) {
                return Promise.resolve(new Response('Rate Limited', {
                    status: 429,
                    headers: new Headers({ 'Retry-After': '0' })
                }));
            }
            return Promise.resolve(new Response('OK', { status: 200 }));
        });
        global.fetch = fetchMock;

        const res = await safeFetch('http://localhost', { maxRetries: 3, baseBackoffMs: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(res.status).toBe(200);
    });

    it('should stop immediately on 429 if it repeats more than maxRetries', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('Rate Limited', { status: 429 }));
        global.fetch = fetchMock;

        const res = await safeFetch('http://localhost', { maxRetries: 2, baseBackoffMs: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
        expect(res.status).toBe(429);
    });

    it('should not retry on 401 Unauthorized', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
        global.fetch = fetchMock;

        const res = await safeFetch('http://localhost', { maxRetries: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(401);
    });

    it('should not retry on 403 Forbidden', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
        global.fetch = fetchMock;

        const res = await safeFetch('http://localhost', { maxRetries: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(403);
    });

    it('should respect Retry-After header wait time on 429 by waiting the given seconds', async () => {
        const fetchMock = vi.fn().mockImplementationOnce(() => {
            return Promise.resolve(new Response('Rate Limited', {
                status: 429,
                headers: new Headers({ 'Retry-After': '1' }) // 1 second
            }));
        }).mockImplementationOnce(() => {
            return Promise.resolve(new Response('OK', { status: 200 }));
        });
        global.fetch = fetchMock;

        const start = Date.now();
        const res = await safeFetch('http://localhost', { maxRetries: 1, baseBackoffMs: 1 });
        const duration = Date.now() - start;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(res.status).toBe(200);
        // It should have waited at least 1s (1000ms), but usually tests with timers can be slow/flaky if not mocked. 
        // We'll just verify duration is near 1000ms (accounting for Vitest overhead).
        expect(duration).toBeGreaterThanOrEqual(1000);
    });
});
