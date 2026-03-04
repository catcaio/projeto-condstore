/**
 * POST /api/domine/intake — Universal Intake v1
 *
 * Public-controlled endpoint for ingesting events from connectors.
 * Versioned, idempotent, and secure.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { domineIntakeEvents, domineTenantIntakeConfigs, domineEvents } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { withInfraErrorHandling, makeRequestId } from '@/infra/http/infra-error';

export const POST = withInfraErrorHandling(async (request: Request, requestId: string) => {
    const req = request as NextRequest;

    // ── 1. Version check ─────────────────────────────────────────────────
    const version = req.headers.get('x-domine-version');
    if (version !== '1') {
        return NextResponse.json(
            { error: 'INVALID_VERSION', message: 'Header x-domine-version: "1" is required', requestId },
            { status: 400 },
        );
    }

    // ── 2. Parse body ────────────────────────────────────────────────────
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: 'INVALID_BODY', message: 'Request body must be valid JSON', requestId },
            { status: 400 },
        );
    }

    const { tenantKey, source, eventType, externalId, occurredAt, payload, signature } = body;

    if (!tenantKey || !source || !eventType || !externalId || !occurredAt) {
        return NextResponse.json(
            { error: 'MISSING_FIELDS', message: 'Required: tenantKey, source, eventType, externalId, occurredAt', requestId },
            { status: 400 },
        );
    }

    // ── 3. Tenant lookup ─────────────────────────────────────────────────
    // Dynamic import to avoid circular dependency issues in tests
    const { getDb } = await import('@/infra/db');
    const db = await getDb();

    const configs = await db
        .select()
        .from(domineTenantIntakeConfigs)
        .where(eq(domineTenantIntakeConfigs.tenantKey, tenantKey))
        .limit(1);

    const config = configs[0];
    if (!config) {
        logger.warn('domine_intake_unknown_tenant', { tenantKey, requestId });
        return NextResponse.json(
            { error: 'UNKNOWN_TENANT', message: 'Invalid tenantKey', requestId },
            { status: 403 },
        );
    }

    const tenantId = config.tenantId;

    // ── 4. Signature validation ──────────────────────────────────────────
    if (signature) {
        if (!config.secret) {
            logger.warn('domine_intake_signature_no_secret', { tenantId, requestId });
            return NextResponse.json(
                { error: 'SIGNATURE_ERROR', message: 'Tenant has no secret configured', requestId },
                { status: 401 },
            );
        }

        // HMAC SHA-256 validation
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(config.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
        );
        const payloadStr = JSON.stringify(payload);
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
        const expectedSig = Array.from(new Uint8Array(sig))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        if (signature !== expectedSig) {
            logger.warn('domine_intake_invalid_signature', { tenantId, requestId });
            return NextResponse.json(
                { error: 'INVALID_SIGNATURE', message: 'HMAC SHA-256 signature mismatch', requestId },
                { status: 401 },
            );
        }
    } else if (!config.allowUnsignedIntake) {
        logger.warn('domine_intake_unsigned_rejected', { tenantId, requestId });
        return NextResponse.json(
            { error: 'SIGNATURE_REQUIRED', message: 'Unsigned intake not allowed for this tenant', requestId },
            { status: 401 },
        );
    } else {
        // Unsigned but allowed — log warning
        logger.warn('domine_intake_unsigned_accepted', { tenantId, requestId });
    }

    // ── 5. Idempotency check & insert ────────────────────────────────────
    const intakeId = crypto.randomUUID();

    try {
        await db.insert(domineIntakeEvents).values({
            id: intakeId,
            tenantId,
            source,
            eventType,
            externalId,
            occurredAt: new Date(occurredAt),
            payloadRedacted: payload,
            status: 'queued',
        });
    } catch (err: any) {
        // Duplicate key → idempotent response
        if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry')) {
            logger.info('domine_intake_duplicate', { tenantId, source, eventType, externalId, requestId });
            return NextResponse.json(
                { status: 'duplicate', requestId },
                { status: 200 },
            );
        }
        throw err;
    }

    // ── 6. Publish to domine_events bus ──────────────────────────────────
    const busEventId = crypto.randomUUID();
    const idempotencyKey = `intake:${tenantId}:${source}:${eventType}:${externalId}`;

    try {
        await db.insert(domineEvents).values({
            id: busEventId,
            tenantId,
            source,
            type: 'connector_event',
            idempotencyKey,
            payloadJson: { intakeEventId: intakeId, source, eventType, externalId, payload },
            status: 'queued',
        });
    } catch (err: any) {
        // Duplicate bus event is fine — idempotent
        if (!(err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry'))) {
            throw err;
        }
    }

    logger.info('domine_intake_accepted', {
        intakeId,
        busEventId,
        tenantId,
        source,
        eventType,
        externalId,
        requestId,
    });

    // ── 7. Return success ────────────────────────────────────────────────
    return NextResponse.json(
        {
            status: 'accepted',
            intakeId,
            busEventId,
            requestId,
        },
        { status: 202 },
    );
});
