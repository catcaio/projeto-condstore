import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '../../infra/db';
import { idempotencyRequests } from '../../drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { structuredLogger as logger } from '../../infra/log/logger';

export interface IdempotencyCheckResult {
    isCached: boolean;
    cachedResponse?: NextResponse;
    idempotencyKey?: string;
}

/**
 * Checks the `Idempotency-Key` header.
 * If present, attempts to lock the operation by inserting a pending record.
 * If the record already exists, it returns the cached response (or 409 if still pending).
 * If the header is missing, it bypasses the idempotency logic completely.
 */
export async function checkIdempotencyKey(
    req: NextRequest,
    route: string,
    tenantId?: string | null
): Promise<IdempotencyCheckResult> {
    const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');

    if (!idempotencyKey) {
        return { isCached: false };
    }

    try {
        // Attempt to insert a pending record lock
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
        const db = await getDb();
        await db.insert(idempotencyRequests).values({
            id: crypto.randomUUID(),
            idempotencyKey,
            route,
            tenantId: tenantId || null,
            expiresAt,
            responseStatus: null,
            responseBody: null,
        });

        // If insert succeeded without a duplicate key error, we own the lock
        return { isCached: false, idempotencyKey };

    } catch (error: any) {
        // Handle ER_DUP_ENTRY from MySQL
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            const db = await getDb();
            const records = await db.select().from(idempotencyRequests).where(
                and(
                    eq(idempotencyRequests.idempotencyKey, idempotencyKey),
                    eq(idempotencyRequests.route, route)
                )
            );
            const existing = records[0];

            if (!existing) {
                // Extremely rare race condition where the row was deleted between insert failure and select
                return { isCached: false, idempotencyKey };
            }

            // Check if it's still pending
            if (existing.responseStatus === null) {
                logger.warn(`[Idempotency] Conflict: operation for key ${idempotencyKey} on ${route} is already in progress.`);
                return {
                    isCached: true,
                    cachedResponse: new NextResponse(
                        JSON.stringify({ error: 'Conflict: This idempotent operation is already in progress.' }),
                        { status: 409, headers: { 'content-type': 'application/json' } }
                    )
                };
            }

            // Return the cached response
            logger.info(`[Idempotency] Cache hit: returning cached result for key ${idempotencyKey} on ${route}.`);
            return {
                isCached: true,
                cachedResponse: new NextResponse(
                    JSON.stringify(existing.responseBody),
                    { status: existing.responseStatus, headers: { 'content-type': 'application/json' } }
                )
            };
        }

        // If it's a random DB failure, we shouldn't block the request if resiliency allows, but logging is vital.
        // For idempotency, if the DB is down, we typically fail closed to prevent accidental double-billing.
        logger.error(`[Idempotency] Failed to verify key ${idempotencyKey} on ${route}. DB error.`, error);
        return {
            isCached: true,
            cachedResponse: new NextResponse(
                JSON.stringify({ error: 'Service Unavailable: Unable to verify idempotency.' }),
                { status: 503, headers: { 'content-type': 'application/json' } }
            )
        };
    }
}

/**
 * Saves the response produced by an idempotent operation so subsequent requests get the cache.
 */
export async function saveIdempotentResponse(
    idempotencyKey: string,
    route: string,
    status: number,
    responseBody: any
): Promise<void> {
    try {
        const db = await getDb();
        await db.update(idempotencyRequests)
            .set({
                responseStatus: status,
                responseBody: responseBody ? responseBody : null,
            })
            .where(
                and(
                    eq(idempotencyRequests.idempotencyKey, idempotencyKey),
                    eq(idempotencyRequests.route, route)
                )
            );
    } catch (error) {
        // If we fail to save the idempotency result, we just log it. The operation already executed successfully.
        // The requester will get their success, but a retry might duplicate it because the cache failed to settle.
        logger.error(`[Idempotency] Failed to save result for key ${idempotencyKey} on ${route}.`, { error });
    }
}
