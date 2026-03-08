/**
 * Operational Packing Consolidation Rules.
 *
 * Implements the official LojaCond logistics packing rules:
 * 1. Max N identical products per volume (configurable, default 3)
 * 2. Physical volume limit: configurable (default 300×200×200 cm)
 * 3. Largest product defines base volume in mixed orders
 * 4. Stacking increment: configurable (default ~10cm) on longest axis per extra unit
 * 5. Smaller products absorbed (weight only) unless they exceed current dims
 *
 * All rule parameters are now configurable via PackingRuleConfig.
 * Defaults are used when no config is provided (backward compatible).
 */

// ─── Configurable Rule Parameters ───────────────────────────────────────────

export interface PackingRuleConfig {
    maxUnitsPerVolume: number;
    stackingIncrementCm: number;
    physicalLimit: { length: number; width: number; height: number };
    absorbSmallerItems: boolean;
    absorbWeightOnly: boolean;
}

/** Safe defaults — used when no DB config is loaded */
export const DEFAULT_PACKING_RULES: PackingRuleConfig = {
    maxUnitsPerVolume: 3,
    stackingIncrementCm: 10,
    physicalLimit: { length: 300, width: 200, height: 200 },
    absorbSmallerItems: true,
    absorbWeightOnly: true,
};

// Legacy exports for backward compatibility with tests
export const MAX_UNITS_PER_VOLUME = DEFAULT_PACKING_RULES.maxUnitsPerVolume;
export const STACKING_INCREMENT_CM = DEFAULT_PACKING_RULES.stackingIncrementCm;
export const PHYSICAL_LIMIT = DEFAULT_PACKING_RULES.physicalLimit;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductInput {
    productRef: string;
    length: number;  // cm
    width: number;   // cm
    height: number;  // cm
    weight: number;  // kg per unit
    quantity: number;
}

export interface PackedVolume {
    length: number;   // cm
    width: number;    // cm
    height: number;   // cm
    weight: number;   // kg (total for this volume)
    stackedUnits: number;
    sourceProducts: string[];
}

export interface PackingResult {
    totalVolumes: number;
    totalWeight: number;
    volumes: PackedVolume[];
}

// ─── Core: Same-product consolidation ───────────────────────────────────────

/**
 * Consolidate identical products into volumes.
 * Rules are configurable via the optional `rules` parameter.
 */
export function consolidateIdenticalProducts(
    product: ProductInput,
    rules: PackingRuleConfig = DEFAULT_PACKING_RULES,
): PackedVolume[] {
    const { length, width, height, weight, quantity, productRef } = product;
    const numVolumes = Math.ceil(quantity / rules.maxUnitsPerVolume);
    const result: PackedVolume[] = [];

    let remaining = quantity;
    for (let i = 0; i < numVolumes; i++) {
        const unitsInThisVolume = Math.min(remaining, rules.maxUnitsPerVolume);
        remaining -= unitsInThisVolume;

        // Apply stacking increment on the longest axis
        const dims = [length, width, height];
        const longestIdx = dims.indexOf(Math.max(...dims));
        const stackedDims = [...dims];
        stackedDims[longestIdx] += (unitsInThisVolume - 1) * rules.stackingIncrementCm;

        const vol: PackedVolume = {
            length: stackedDims[0],
            width: stackedDims[1],
            height: stackedDims[2],
            weight: weight * unitsInThisVolume,
            stackedUnits: unitsInThisVolume,
            sourceProducts: [productRef],
        };

        // Enforce physical limits (split if exceeded)
        const splits = enforcePhysicalLimits(vol, rules);
        result.push(...splits);
    }

    return result;
}

// ─── Core: Mixed order handling ─────────────────────────────────────────────

/**
 * Consolidate a mixed order: largest product is the base volume,
 * smaller products are absorbed (weight only, unless they exceed dims).
 */
export function consolidateMixedOrder(
    products: ProductInput[],
    rules: PackingRuleConfig = DEFAULT_PACKING_RULES,
): PackingResult {
    if (products.length === 0) {
        return { totalVolumes: 0, totalWeight: 0, volumes: [] };
    }

    if (products.length === 1) {
        const vols = consolidateIdenticalProducts(products[0], rules);
        return {
            totalVolumes: vols.length,
            totalWeight: vols.reduce((s, v) => s + v.weight, 0),
            volumes: vols,
        };
    }

    // Sort by physical volume descending (largest first)
    const sorted = [...products].sort((a, b) => {
        return (b.length * b.width * b.height) - (a.length * a.width * a.height);
    });

    const largestProduct = sorted[0];
    const baseVolumes = consolidateIdenticalProducts(largestProduct, rules);
    const remainingProducts = sorted.slice(1);
    const extraVolumes: PackedVolume[] = [];

    for (const smallProduct of remainingProducts) {
        let remainingQty = smallProduct.quantity;

        if (rules.absorbSmallerItems) {
            for (let i = 0; i < baseVolumes.length && remainingQty > 0; i++) {
                const vol = baseVolumes[i];
                const fitsInside =
                    smallProduct.length <= vol.length &&
                    smallProduct.width <= vol.width &&
                    smallProduct.height <= vol.height;

                if (fitsInside) {
                    const absorb = Math.min(remainingQty, rules.maxUnitsPerVolume);
                    vol.weight += smallProduct.weight * absorb;
                    vol.sourceProducts.push(smallProduct.productRef);
                    remainingQty -= absorb;
                }
            }
        }

        if (remainingQty > 0) {
            const leftover: ProductInput = { ...smallProduct, quantity: remainingQty };
            extraVolumes.push(...consolidateIdenticalProducts(leftover, rules));
        }
    }

    const allVolumes = [...baseVolumes, ...extraVolumes];
    return {
        totalVolumes: allVolumes.length,
        totalWeight: allVolumes.reduce((s, v) => s + v.weight, 0),
        volumes: allVolumes,
    };
}

// ─── Physical limit enforcement ─────────────────────────────────────────────

export function enforcePhysicalLimits(
    vol: PackedVolume,
    rules: PackingRuleConfig = DEFAULT_PACKING_RULES,
): PackedVolume[] {
    const limit = rules.physicalLimit;
    const exceedsLength = vol.length > limit.length;
    const exceedsWidth = vol.width > limit.width;
    const exceedsHeight = vol.height > limit.height;

    if (!exceedsLength && !exceedsWidth && !exceedsHeight) {
        return [vol];
    }

    if (vol.stackedUnits <= 1) {
        return [{
            ...vol,
            length: Math.min(vol.length, limit.length),
            width: Math.min(vol.width, limit.width),
            height: Math.min(vol.height, limit.height),
        }];
    }

    const halfUnits = Math.ceil(vol.stackedUnits / 2);
    const otherHalf = vol.stackedUnits - halfUnits;
    const weightPerUnit = vol.weight / vol.stackedUnits;

    const vol1: PackedVolume = {
        length: vol.length, width: vol.width, height: vol.height,
        weight: weightPerUnit * halfUnits,
        stackedUnits: halfUnits,
        sourceProducts: [...vol.sourceProducts],
    };
    const vol2: PackedVolume = {
        length: vol.length, width: vol.width, height: vol.height,
        weight: weightPerUnit * otherHalf,
        stackedUnits: otherHalf,
        sourceProducts: [...vol.sourceProducts],
    };

    return [...enforcePhysicalLimits(vol1, rules), ...enforcePhysicalLimits(vol2, rules)];
}
