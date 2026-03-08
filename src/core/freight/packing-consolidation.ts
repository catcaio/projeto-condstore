/**
 * Operational Packing Consolidation Rules.
 * 
 * Implements the official LojaCond logistics packing rules:
 * 1. Max 3 identical products per volume (group 1–3, split 4+)
 * 2. Physical volume limit: 300×200×200 cm
 * 3. Largest product defines base volume in mixed orders
 * 4. Stacking increment: ~10cm on longest axis per extra unit
 * 5. Smaller products absorbed (weight only) unless they exceed current dims
 */

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_UNITS_PER_VOLUME = 3;
export const STACKING_INCREMENT_CM = 10;

export const PHYSICAL_LIMIT = {
    length: 300, // cm
    width: 200,  // cm
    height: 200, // cm
};

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
 * Consolidate identical products into volumes of max 3 units.
 * Stacking adds ~10cm on the longest axis per extra unit.
 */
export function consolidateIdenticalProducts(product: ProductInput): PackedVolume[] {
    const { length, width, height, weight, quantity, productRef } = product;
    const numVolumes = Math.ceil(quantity / MAX_UNITS_PER_VOLUME);
    const result: PackedVolume[] = [];

    let remaining = quantity;
    for (let i = 0; i < numVolumes; i++) {
        const unitsInThisVolume = Math.min(remaining, MAX_UNITS_PER_VOLUME);
        remaining -= unitsInThisVolume;

        // Apply stacking increment on the longest axis
        const dims = [length, width, height];
        const longestIdx = dims.indexOf(Math.max(...dims));
        const stackedDims = [...dims];
        stackedDims[longestIdx] += (unitsInThisVolume - 1) * STACKING_INCREMENT_CM;

        let vol: PackedVolume = {
            length: stackedDims[0],
            width: stackedDims[1],
            height: stackedDims[2],
            weight: weight * unitsInThisVolume,
            stackedUnits: unitsInThisVolume,
            sourceProducts: [productRef],
        };

        // Enforce physical limits (split if exceeded)
        const splits = enforcePhysicalLimits(vol);
        result.push(...splits);
    }

    return result;
}

// ─── Core: Mixed order handling ─────────────────────────────────────────────

/**
 * Consolidate a mixed order: largest product is the base volume,
 * smaller products are absorbed (weight only, unless they exceed dims).
 */
export function consolidateMixedOrder(products: ProductInput[]): PackingResult {
    if (products.length === 0) {
        return { totalVolumes: 0, totalWeight: 0, volumes: [] };
    }

    // If only one distinct product, use same-product logic
    if (products.length === 1) {
        const vols = consolidateIdenticalProducts(products[0]);
        return {
            totalVolumes: vols.reduce((s, v) => s + 1, 0),
            totalWeight: vols.reduce((s, v) => s + v.weight, 0),
            volumes: vols,
        };
    }

    // Sort by physical volume descending (largest first)
    const sorted = [...products].sort((a, b) => {
        const volA = a.length * a.width * a.height;
        const volB = b.length * b.width * b.height;
        return volB - volA;
    });

    // Process largest product first to create base volumes
    const largestProduct = sorted[0];
    const baseVolumes = consolidateIdenticalProducts(largestProduct);

    // Try to absorb smaller products into existing volumes
    const remainingProducts = sorted.slice(1);
    const extraVolumes: PackedVolume[] = [];

    for (const smallProduct of remainingProducts) {
        let remainingQty = smallProduct.quantity;

        for (let i = 0; i < baseVolumes.length && remainingQty > 0; i++) {
            const vol = baseVolumes[i];
            // Can absorb if the small product fits within current volume dimensions
            const fitsInside =
                smallProduct.length <= vol.length &&
                smallProduct.width <= vol.width &&
                smallProduct.height <= vol.height;

            if (fitsInside) {
                // Absorb: add weight only, dimensions unchanged
                const absorb = Math.min(remainingQty, MAX_UNITS_PER_VOLUME);
                vol.weight += smallProduct.weight * absorb;
                vol.sourceProducts.push(smallProduct.productRef);
                remainingQty -= absorb;
            }
        }

        // Any remaining quantity gets its own volumes
        if (remainingQty > 0) {
            const leftover: ProductInput = { ...smallProduct, quantity: remainingQty };
            extraVolumes.push(...consolidateIdenticalProducts(leftover));
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

/**
 * Split a volume if it exceeds maximum physical dimensions (300×200×200 cm).
 * Returns one or more volumes.
 */
export function enforcePhysicalLimits(vol: PackedVolume): PackedVolume[] {
    const exceedsLength = vol.length > PHYSICAL_LIMIT.length;
    const exceedsWidth = vol.width > PHYSICAL_LIMIT.width;
    const exceedsHeight = vol.height > PHYSICAL_LIMIT.height;

    if (!exceedsLength && !exceedsWidth && !exceedsHeight) {
        return [vol];
    }

    // Simple split: divide the offending axis and create additional volumes
    // Each split volume gets half the units (minimum 1)
    if (vol.stackedUnits <= 1) {
        // Can't split a single unit further — clamp to limit and warn
        return [{
            ...vol,
            length: Math.min(vol.length, PHYSICAL_LIMIT.length),
            width: Math.min(vol.width, PHYSICAL_LIMIT.width),
            height: Math.min(vol.height, PHYSICAL_LIMIT.height),
        }];
    }

    // Split into 2 volumes with roughly equal units
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

    // Recursively enforce limits on each half
    return [...enforcePhysicalLimits(vol1), ...enforcePhysicalLimits(vol2)];
}
