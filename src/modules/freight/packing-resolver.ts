/**
 * Packing Dimension Resolver.
 * Resolves package dimensions and weight using packing_profiles when available.
 * Falls back to raw FreightRequest values if no profile matches.
 */

import { getDb } from '../../infra/db';
import { packingProfiles } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../infra/logger';

export interface ResolvedDimensions {
    width: number;   // cm
    height: number;  // cm
    length: number;  // cm
    unitWeight: number; // kg per unit
    totalWeight: number; // kg for all units
    volumes: number;
    source: 'manual_override' | 'packing_profile' | 'request_override' | 'default';
    profileId?: string;
    packingMode?: string;
}

interface ResolveInput {
    tenantId?: string;
    productRef?: string;
    quantity: number;
    /** Explicit override from request — takes priority over profile lookup */
    dimensions?: { width: number; height: number; length: number };
    unitWeight?: number;
    defaultUnitWeight: number;
    /** Manual operator override — highest priority */
    manualOverride?: {
        volumes: { length: number; width: number; height: number; qty: number }[];
        totalWeight: number;
    };
}

/**
 * Resolve final package dimensions for a freight quote.
 *
 * Priority:
 * 0. Manual operator override (cockpit simulator)
 * 1. Explicit dimensions/weight in the request (API override)
 * 2. Active packing profile from database
 * 3. Default weight with no dimensions
 */
export async function resolvePackingDimensions(input: ResolveInput): Promise<ResolvedDimensions> {
    const { tenantId, productRef, quantity, dimensions, unitWeight, defaultUnitWeight, manualOverride } = input;

    // ─── Priority 0: Manual operator override (cockpit) ─────────────────
    if (manualOverride && manualOverride.volumes.length > 0) {
        const totalQty = manualOverride.volumes.reduce((s, v) => s + v.qty, 0);
        // Use the largest single volume row for representative dimensions
        const largest = manualOverride.volumes.reduce((best, v) => {
            const vol = v.length * v.width * v.height;
            const bestVol = best.length * best.width * best.height;
            return vol > bestVol ? v : best;
        }, manualOverride.volumes[0]);
        logger.info('packing_resolver: using manual_override', {
            source: 'manual_override', tenantId, totalWeight: manualOverride.totalWeight,
            volumes: totalQty, dims: `${largest.length}x${largest.width}x${largest.height}`,
        });
        return {
            width: largest.width,
            height: largest.height,
            length: largest.length,
            unitWeight: manualOverride.totalWeight / (totalQty || 1),
            totalWeight: manualOverride.totalWeight,
            volumes: totalQty,
            source: 'manual_override',
        };
    }

    // ─── Priority 1: Explicit override from request ─────────────────────
    if (dimensions && unitWeight) {
        const w = unitWeight * quantity;
        logger.debug('packing_resolver: using request override', {
            source: 'request_override', tenantId, dims: `${dimensions.width}x${dimensions.height}x${dimensions.length}`, unitWeight, totalWeight: w,
        });
        return {
            width: dimensions.width,
            height: dimensions.height,
            length: dimensions.length,
            unitWeight,
            totalWeight: w,
            volumes: 1,
            source: 'request_override',
        };
    }

    // ─── Priority 2: Active packing profile from DB ─────────────────────
    if (tenantId) {
        try {
            const profile = await lookupProfile(tenantId, productRef);
            if (profile) {
                const resolved = computePackedDimensions(profile, quantity);
                logger.info('packing_resolver: using packing_profile', {
                    source: 'packing_profile',
                    tenantId,
                    profileId: profile.id,
                    productRef: profile.productRef,
                    packingMode: profile.packingMode,
                    dims: `${resolved.width}x${resolved.height}x${resolved.length}`,
                    totalWeight: resolved.totalWeight,
                    volumes: resolved.volumes,
                });
                return resolved;
            }
        } catch (err) {
            logger.warn('packing_resolver: profile lookup failed, falling back', {
                error: (err as Error).message, tenantId,
            });
        }
    }

    // ─── Priority 3: Default fallback ───────────────────────────────────
    const effectiveWeight = unitWeight || defaultUnitWeight;
    const totalWeight = effectiveWeight * quantity;
    logger.debug('packing_resolver: using default fallback', {
        source: 'default', tenantId, unitWeight: effectiveWeight, totalWeight,
    });
    return {
        width: 0,
        height: 0,
        length: 0,
        unitWeight: effectiveWeight,
        totalWeight,
        volumes: 1,
        source: 'default',
    };
}

// ─── Profile lookup ─────────────────────────────────────────────────────────

type ProfileRow = typeof packingProfiles.$inferSelect;

async function lookupProfile(tenantId: string, productRef?: string): Promise<ProfileRow | null> {
    const db = await getDb();

    // Try exact match on productRef if provided
    if (productRef) {
        const matches = await db
            .select()
            .from(packingProfiles)
            .where(and(
                eq(packingProfiles.tenantId, tenantId),
                eq(packingProfiles.productRef, productRef),
                eq(packingProfiles.isActive, true),
            ))
            .limit(1);

        if (matches.length > 0) return matches[0];
    }

    // No match — could add fuzzy matching or default profile lookup here later
    return null;
}

// ─── Packing computation ────────────────────────────────────────────────────

function computePackedDimensions(profile: ProfileRow, quantity: number): ResolvedDimensions {
    const baseH = parseFloat(String(profile.baseHeight)) || 0;
    const baseW = parseFloat(String(profile.baseWidth)) || 0;
    const baseL = parseFloat(String(profile.baseLength)) || 0;
    const baseWeight = parseFloat(String(profile.baseWeight)) || 0;
    const maxPerVolume = profile.maxUnitsPerVolume || 1;
    const hInc = parseFloat(String(profile.heightIncrementPerExtraUnit)) || 0;
    const wInc = parseFloat(String(profile.widthIncrementPerExtraUnit)) || 0;
    const lInc = parseFloat(String(profile.lengthIncrementPerExtraUnit)) || 0;
    const mode = profile.packingMode || 'SINGLE_FIXED';

    const volumes = Math.ceil(quantity / maxPerVolume);
    const unitsInVolume = Math.min(quantity, maxPerVolume);

    let packedH = baseH;
    let packedW = baseW;
    let packedL = baseL;

    switch (mode) {
        case 'STACK_VERTICAL':
            packedH = baseH + (unitsInVolume - 1) * hInc;
            break;
        case 'STACK_HORIZONTAL':
            packedW = baseW + (unitsInVolume - 1) * wInc;
            break;
        case 'NESTED':
            packedH = baseH + (unitsInVolume - 1) * hInc;
            break;
        case 'CUSTOM_RULE':
            packedH = baseH + (unitsInVolume - 1) * hInc;
            packedW = baseW + (unitsInVolume - 1) * wInc;
            packedL = baseL + (unitsInVolume - 1) * lInc;
            break;
        case 'SINGLE_FIXED':
        default:
            // Each unit is identical — dimensions don't grow with quantity
            break;
    }

    return {
        width: packedW,
        height: packedH,
        length: packedL,
        unitWeight: baseWeight,
        totalWeight: baseWeight * quantity,
        volumes,
        source: 'packing_profile',
        profileId: profile.id,
        packingMode: mode,
    };
}
