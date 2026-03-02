import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '@/infra/config/internal-token';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { structuredLogger } from '@/infra/log/logger';
import { userRepository } from '@/infra/repositories/user.repository';
import { hashPassword } from '@/infra/auth/password';
import { sha256Hex } from '@/infra/attribution/hash';

const route = '/api/internal/auth/reset-admin';

const resetAdminSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
});

function hashEmailForLog(email: string): string {
  return sha256Hex(email.trim().toLowerCase())?.slice(0, 16) ?? 'unknown';
}

function isProductionVercelEnv(): boolean {
  return process.env.VERCEL_ENV?.trim().toLowerCase() === 'production';
}

async function _POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);

  try {
    if (isProductionVercelEnv()) {
      structuredLogger.warn('internal_reset_admin_blocked_prod', {
        requestId,
        route,
        eventType: 'internal_auth_reset_admin',
      });
      return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Not allowed in production');
    }

    try {
      getInternalExportTokenOrThrow();
    } catch (error) {
      structuredLogger.error('internal_reset_admin_token_not_configured', {
        requestId,
        route,
        eventType: 'internal_auth_reset_admin',
        errorCode: ErrorCode.AUTH_REQUIRED,
        error,
      });
      return errorResponse(
        ErrorCode.AUTH_REQUIRED,
        500,
        requestId,
        'INTERNAL_DIAG_TOKEN/INTERNAL_EXPORT_TOKEN not configured',
      );
    }

    const token = request.headers.get('x-internal-token');
    if (!isInternalTokenAuthorized(token)) {
      return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
    }

    const parsed = resetAdminSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload');
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const emailHash = hashEmailForLog(normalizedEmail);

    const user = await userRepository.getUserByEmail(normalizedEmail);
    if (!user) {
      structuredLogger.warn('internal_reset_admin_user_not_found', {
        requestId,
        route,
        eventType: 'internal_auth_reset_admin',
        emailHash,
      });
      return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'User not found');
    }

    const passwordHash = hashPassword(parsed.data.newPassword);
    const updated = await userRepository.updatePasswordHashAndBumpSessionVersion(user.id, passwordHash);
    if (!updated) {
      structuredLogger.warn('internal_reset_admin_update_noop', {
        requestId,
        route,
        eventType: 'internal_auth_reset_admin',
        emailHash,
        userId: user.id,
      });
      return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to reset password');
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    attachRequestIdHeader(response, requestId);

    structuredLogger.info('internal_reset_admin_success', {
      requestId,
      route,
      eventType: 'internal_auth_reset_admin',
      emailHash,
      userId: user.id,
      durationMs: Date.now() - startedAt,
      outcome: 'ok',
      status: 200,
    });
    return response;
  } catch (error) {
    structuredLogger.error('internal_reset_admin_failed', {
      requestId,
      route,
      eventType: 'internal_auth_reset_admin',
      errorCode: ErrorCode.DB_ERROR,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Admin password reset failed');
  }
}

export const POST = withGlobalErrorInterceptor(_POST);
