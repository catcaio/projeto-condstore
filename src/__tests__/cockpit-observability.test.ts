import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDomineConnectors } from '../app/api/cockpit/domine/connectors/route';
import { GET as getDomineSummary } from '../app/api/cockpit/domine/summary/route';
import { logger } from '../infra/logger';
import { ErrorCode } from '../infra/http/error-response';

// Mock dependencies
vi.mock('@/infra/auth/guards', () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    ok: true,
    session: { tenantId: 'test-tenant-123' },
  }),
}));

vi.mock('../domine/tenant', () => ({
  isDomineEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/infra/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock requestTrace since it depends on AsyncLocalStorage context internally
vi.mock('@/infra/http/request-trace', () => ({
  makeRequestId: vi.fn((req) => req.headers.get('x-request-id') || 'req-obs-fallback'),
  getTracedRequestId: vi.fn((req) => req.headers.get('x-request-id')),
  withRequestTrace: vi.fn((handler) => handler), // Pass-through
}));

describe('Cockpit Observability Baseline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1: propagates x-request-id and ensures standardized errorResponse when domine is disabled', async () => {
    const mockRequest = new NextRequest('http://localhost/api/cockpit/domine/connectors', {
      headers: { 'x-request-id': 'req-obs-123' },
    });

    const response = await getDomineConnectors(mockRequest);
    const json = await response.json();

    // Verify standardized errorResponse
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(json.error.requestId).toBe('req-obs-123'); // Correlates to request trace
    
    // Verify x-request-id header maps to payload
    expect(response.headers.get('x-request-id')).toBe('req-obs-123');

    // Verify structured logging before returning error
    expect(logger.warn).toHaveBeenCalledWith(
      'domine_not_enabled',
      expect.objectContaining({
        requestId: 'req-obs-123',
        tenantId: 'test-tenant-123',
        route: '/api/cockpit/domine/connectors'
      })
    );
  });

  it('Scenario 2: domine summary emits consistent requestId and logs', async () => {
    const mockRequest = new NextRequest('http://localhost/api/cockpit/domine/summary', {
      headers: { 'x-request-id': 'req-info-456' },
    });

    const response = await getDomineSummary(mockRequest);
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.error.code).toBe(ErrorCode.FORBIDDEN);
    expect(json.error.requestId).toBe('req-info-456');

    expect(logger.warn).toHaveBeenCalledWith(
      'domine_not_enabled',
      expect.objectContaining({
        requestId: 'req-info-456',
        tenantId: 'test-tenant-123',
        route: '/api/cockpit/domine/summary'
      })
    );
  });
});
