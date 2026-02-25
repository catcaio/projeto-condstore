import type { NextRequest, NextResponse } from 'next/server';
import { ErrorCode, errorResponse, type ErrorResponsePayload } from '../http/error-response';
import { makeRequestId } from '../http/request-trace';
import { getSessionUser, type SessionPayload } from './session';
import { isRole, type Role } from './roles';

export interface GuardedSession extends SessionPayload {
  sub: string;
  tenantId: string;
  role: Role;
}

type GuardFailureCode = ErrorCode.AUTH_REQUIRED | ErrorCode.FORBIDDEN;

export type GuardFailure = {
  ok: false;
  code: GuardFailureCode;
  requestId: string;
  response: NextResponse<ErrorResponsePayload>;
};

export type GuardSuccess<TSession extends GuardedSession = GuardedSession> = {
  ok: true;
  requestId: string;
  session: TSession;
};

export type GuardResult<TSession extends GuardedSession = GuardedSession> = GuardSuccess<TSession> | GuardFailure;

interface GuardOptions {
  requestId?: string;
  unauthorizedMessage?: string;
  forbiddenMessage?: string;
}

function normalizeGuardedSession(session: SessionPayload | null): GuardedSession | null {
  if (!session) return null;

  const sub = typeof session.sub === 'string' ? session.sub.trim() : '';
  const tenantId = typeof session.tenantId === 'string' ? session.tenantId.trim() : '';

  if (!sub || !tenantId || !isRole(session.role)) {
    return null;
  }

  return {
    ...session,
    sub,
    tenantId,
    role: session.role,
  };
}

function resolveRequestId(request: NextRequest, requestId?: string): string {
  const explicit = requestId?.trim();
  if (explicit) return explicit;

  try {
    return makeRequestId(request);
  } catch {
    return crypto.randomUUID();
  }
}

export async function requireSession(request: NextRequest, options?: GuardOptions): Promise<GuardResult> {
  const requestId = resolveRequestId(request, options?.requestId);
  const session = normalizeGuardedSession(await getSessionUser(request));

  if (!session) {
    return {
      ok: false,
      code: ErrorCode.AUTH_REQUIRED,
      requestId,
      response: errorResponse(
        ErrorCode.AUTH_REQUIRED,
        401,
        requestId,
        options?.unauthorizedMessage ?? 'Unauthorized',
      ),
    };
  }

  return { ok: true, requestId, session };
}

export async function requireAdmin(request: NextRequest, options?: GuardOptions): Promise<GuardResult> {
  const sessionResult = await requireSession(request, options);
  if (!sessionResult.ok) {
    return sessionResult;
  }

  if (sessionResult.session.role !== 'admin') {
    return {
      ok: false,
      code: ErrorCode.FORBIDDEN,
      requestId: sessionResult.requestId,
      response: errorResponse(
        ErrorCode.FORBIDDEN,
        403,
        sessionResult.requestId,
        options?.forbiddenMessage ?? 'Forbidden',
      ),
    };
  }

  return sessionResult;
}
