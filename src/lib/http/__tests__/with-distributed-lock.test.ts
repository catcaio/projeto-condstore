import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withDistributedLock } from '../with-distributed-lock';
import { LockAcquisitionError } from '../../infra/errors';
import * as distributedLock from '../../infra/distributed-lock';
import * as errorResponseMod from '../../../infra/http/error-response';
import * as requestTrace from '../../../infra/http/request-trace';

// Mock dependencies
vi.mock('../../infra/distributed-lock', () => ({
  withDistributedLock: vi.fn(),
}));

vi.mock('../../../infra/http/error-response', () => ({
  errorResponse: vi.fn(),
  ErrorCode: {
    LOCK_BUSY: 'LOCK_BUSY',
  },
}));

vi.mock('../../../infra/http/request-trace', () => ({
  makeRequestId: vi.fn(),
}));

describe('withDistributedLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReq = new NextRequest('http://localhost/api/test', { method: 'POST' });
  const mockCtx = { params: { id: '123' } };

  it('should successfully acquire lock and return handler response', async () => {
    const mockResponse = new NextResponse('Success', { status: 200 });
    const mockHandler = vi.fn().mockResolvedValue(mockResponse);
    const keyGenerator = vi.fn().mockReturnValue('test-key');

    // Setup the mock to simulate successful lock acquisition and execution of handler
    vi.spyOn(distributedLock, 'withDistributedLock').mockImplementation(async (key, ttl, handler) => {
      return handler();
    });

    const wrappedHandler = withDistributedLock(keyGenerator, 30, mockHandler);
    const response = await wrappedHandler(mockReq, mockCtx);

    expect(keyGenerator).toHaveBeenCalledWith(mockReq, mockCtx);
    expect(distributedLock.withDistributedLock).toHaveBeenCalledWith('test-key', 30, expect.any(Function));
    expect(mockHandler).toHaveBeenCalledWith(mockReq, mockCtx);
    expect(response).toBe(mockResponse);
  });

  it('should return 423 Locked when lock cannot be acquired', async () => {
    const mockHandler = vi.fn();
    const keyGenerator = vi.fn().mockReturnValue('test-key');

    vi.spyOn(requestTrace, 'makeRequestId').mockReturnValue('req-123');

    const expectedErrorResponse = new NextResponse(
      JSON.stringify({ error: 'Locked' }),
      { status: 423 }
    );
    vi.spyOn(errorResponseMod, 'errorResponse').mockReturnValue(expectedErrorResponse as any);

    // Setup the mock to throw LockAcquisitionError
    vi.spyOn(distributedLock, 'withDistributedLock').mockRejectedValue(new LockAcquisitionError('test-key'));

    const wrappedHandler = withDistributedLock(keyGenerator, 30, mockHandler);
    const response = await wrappedHandler(mockReq, mockCtx);

    expect(requestTrace.makeRequestId).toHaveBeenCalledWith(mockReq);
    expect(errorResponseMod.errorResponse).toHaveBeenCalledWith(
      errorResponseMod.ErrorCode.LOCK_BUSY,
      423,
      'req-123',
      'Resource is locked by another process'
    );
    expect(response).toBe(expectedErrorResponse);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should rethrow unexpected errors', async () => {
    const mockHandler = vi.fn();
    const keyGenerator = vi.fn().mockReturnValue('test-key');

    const unexpectedError = new Error('Database connection failed');

    vi.spyOn(distributedLock, 'withDistributedLock').mockRejectedValue(unexpectedError);

    const wrappedHandler = withDistributedLock(keyGenerator, 30, mockHandler);

    await expect(wrappedHandler(mockReq, mockCtx)).rejects.toThrow('Database connection failed');
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
