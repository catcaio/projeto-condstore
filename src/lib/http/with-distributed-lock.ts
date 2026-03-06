import { NextRequest } from 'next/server';
import { withDistributedLock as acquireLock } from '../infra/distributed-lock';
import { LockAcquisitionError } from '../infra/errors';
import { errorResponse, ErrorCode } from '../../infra/http/error-response';
import { makeRequestId } from '../../infra/http/request-trace';

type HandlerWrapper = (req: NextRequest, ctx: any) => Promise<Response>;

/**
 * Wraps a Next.js App Router API handler with a distributed lock.
 * If the lock cannot be acquired, returns HTTP 423 Locked.
 * 
 * @param keyGenerator Function to generate the lock key based on request/context
 * @param ttlSeconds The time-to-live for the lock
 * @param handler The inner route handler to execute if the lock is acquired
 */
export function withDistributedLock(
    keyGenerator: (req: NextRequest, ctx: any) => string,
    ttlSeconds: number,
    handler: HandlerWrapper
): HandlerWrapper {
    return async (req: NextRequest, ctx?: any): Promise<Response> => {
        try {
            const key = keyGenerator(req, ctx);
            return await acquireLock(key, ttlSeconds, () => handler(req, ctx));
        } catch (error) {
            if (error instanceof LockAcquisitionError) {
                return errorResponse(ErrorCode.LOCK_BUSY, 423, makeRequestId(req), 'Resource is locked by another process');
            }
            throw error;
        }
    };
}
