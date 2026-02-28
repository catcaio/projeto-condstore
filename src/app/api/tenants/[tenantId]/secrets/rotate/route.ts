import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { tenantSecretsRepository } from '@/infra/repositories/tenant-secrets.repository';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';
import { encryptSecret } from '@/infra/security/encryption';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { makeRequestId } from '@/infra/http/request-trace';
import { structuredLogger } from '@/infra/log/logger';
import crypto from 'crypto';

import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

export async function POST(req: NextRequest, { params }: { params: { tenantId: string } }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    // 1. Session and Tenant Match
    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    // 2. Admin verification
    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    // Rate Limiter
    const rlDecision = await rateLimiter.limit('secrets.rotate', guard.tenantId, {
        max: 10,
        windowSec: 60,
    });

    if (!rlDecision.allowed) {
        const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        return applyRateLimitHeaders(res, rlDecision);
    }

    try {
        const body = await req.json();
        const { scope, keyName, newValue } = body;

        if (!scope || !keyName || typeof newValue !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
        }

        if (!newValue.trim()) {
            return NextResponse.json({ error: 'Secret value cannot be empty' }, { status: 400 });
        }

        // Encrypt and Hash
        const encrypted = encryptSecret(newValue.trim());
        const hash = crypto.createHash('sha256').update(newValue.trim()).digest('hex');

        // Upsert
        await tenantSecretsRepository.upsertSecret({
            id: crypto.randomUUID(),
            tenantId: guard.tenantId,
            scope,
            keyName,
            valueEncrypted: encrypted,
            valueHash: hash,
            lastRotatedAt: new Date(),
            rotatedByUserId: guard.sessionUser.sub, // The user ID that triggered the rotation
        });

        // Audit Log
        await adminAuditLogRepository.log({
            tenantId: guard.tenantId,
            userId: guard.sessionUser.sub,
            action: 'SECRET_ROTATED',
            metadata: { scope, keyName, requestId }
        });

        structuredLogger.info('Secret rotated successfully', {
            tenantId: guard.tenantId,
            scope,
            keyName,
            userId: guard.sessionUser.sub,
            requestId,
        });

        const res = NextResponse.json({ ok: true, message: 'Secret rotated' });
        return applyRateLimitHeaders(res, rlDecision);
    } catch (error: any) {
        structuredLogger.error('Failed to rotate secret', { err: error.message, tenantId: guard.tenantId, requestId });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
