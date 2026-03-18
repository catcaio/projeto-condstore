import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, HEAD } from '../route';
import { structuredLogger } from '@/infra/log/logger';

vi.mock('@/infra/log/logger', () => ({
  structuredLogger: {
    info: vi.fn(),
  },
}));

describe('GET /pricing', () => {
  it('redirects to /planos/envios preserving the query string', async () => {
    const request = new NextRequest('http://localhost/pricing?canceled=1&utm_source=google');

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/planos/envios?canceled=1&utm_source=google');
    expect(structuredLogger.info).toHaveBeenCalledWith('public_pricing_redirect', expect.objectContaining({
      route: '/pricing',
      destination: '/planos/envios',
      hasQuery: true,
    }));
  });

  it('reuses the same redirect behavior for HEAD requests', async () => {
    const request = new NextRequest('http://localhost/pricing');

    const response = await HEAD(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/planos/envios');
  });
});
