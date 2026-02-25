import { NextResponse } from 'next/server';

export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  LOCK_BUSY = 'LOCK_BUSY',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UPSTREAM_TWILIO_ERROR = 'UPSTREAM_TWILIO_ERROR',
  DB_ERROR = 'DB_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorResponsePayload {
  ok: false;
  error: {
    code: ErrorCode;
    requestId: string;
    message?: string;
    details?: unknown;
  };
}

export function errorResponse(
  code: ErrorCode,
  status: number,
  requestId: string,
  message?: string,
  details?: unknown,
): NextResponse<ErrorResponsePayload> {
  const payload: ErrorResponsePayload = {
    ok: false,
    error: {
      code,
      requestId,
      ...(message ? { message } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };

  const response = NextResponse.json(payload, { status });
  response.headers.set('x-request-id', requestId);
  return response;
}

export function inferErrorCodeFromStatus(status: number): ErrorCode {
  if (status === 401) return ErrorCode.AUTH_REQUIRED;
  if (status === 403) return ErrorCode.FORBIDDEN;
  if (status === 409) return ErrorCode.LOCK_BUSY;
  if (status === 429) return ErrorCode.RATE_LIMITED;
  if (status >= 400 && status < 500) return ErrorCode.VALIDATION_ERROR;
  if (status >= 500) return ErrorCode.UNKNOWN;
  return ErrorCode.UNKNOWN;
}
