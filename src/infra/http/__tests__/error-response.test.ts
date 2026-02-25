import { describe, expect, it } from 'vitest';
import { ErrorCode, errorResponse } from '../error-response';

describe('errorResponse', () => {
  it('includes requestId and code in payload and header', async () => {
    const response = errorResponse(
      ErrorCode.FORBIDDEN,
      403,
      'req-123',
      'Forbidden',
      { reason: 'role' },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('x-request-id')).toBe('req-123');
    expect(body).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        requestId: 'req-123',
        message: 'Forbidden',
        details: { reason: 'role' },
      },
    });
  });
});

