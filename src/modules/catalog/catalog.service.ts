import { and, desc, eq, like, or } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { packingProfiles, products } from '@/drizzle/schema';

export interface CatalogProductLookup {
    productId: string;
    id: string;
    productRef?: string | null;
    name: string;
    sku: string | null;
    weight: number;
    volume: number;
    basePrice: number;
    price: number;
    dimensions: {
        width: number | null;
        height: number | null;
        length: number | null;
    };
}

export type CatalogProductMatch = CatalogProductLookup;

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuery(query: string): string {
    return query.trim();
}

function mapProductRow(row: typeof products.$inferSelect): CatalogProductLookup {
    const width = toNumber(row.width, 0);
    const height = toNumber(row.height, 0);
    const length = toNumber(row.length, 0);
    const price = toNumber(row.price, 0);

    return {
        productId: row.id,
        id: row.id,
        productRef: row.sku ?? row.id,
        name: row.name,
        sku: row.sku ?? null,
        weight: toNumber(row.weight, 0),
        volume: width * height * length,
        basePrice: price,
        price,
        dimensions: {
            width: row.width !== null ? width : null,
            height: row.height !== null ? height : null,
            length: row.length !== null ? length : null,
        },
    };
}

function mapPackingProfileRow(row: typeof packingProfiles.$inferSelect): CatalogProductLookup {
    const width = toNumber(row.baseWidth, 0);
    const height = toNumber(row.baseHeight, 0);
    const length = toNumber(row.baseLength, 0);

    return {
        productId: row.id,
        id: row.id,
        productRef: row.productRef ?? row.id,
        name: row.profileName,
        sku: row.productRef ?? null,
        weight: toNumber(row.baseWeight, 0),
        volume: width * height * length,
        basePrice: 0,
        price: 0,
        dimensions: {
            width: width || null,
            height: height || null,
            length: length || null,
        },
    };
}

export const catalogService = {
    async searchProductsByName(tenantId: string, query: string): Promise<CatalogProductLookup[]> {
        const normalizedQuery = normalizeQuery(query);
        if (!normalizedQuery) return [];

        const db = await getDb();
        const searchPattern = `%${normalizedQuery}%`;

        const [productRows, packingRows] = await Promise.all([
            db
                .select()
                .from(products)
                .where(
                    and(
                        eq(products.tenantId, tenantId),
                        or(
                            eq(products.id, normalizedQuery),
                            like(products.name, searchPattern),
                            like(products.sku, searchPattern),
                        ),
                    ),
                )
                .orderBy(desc(products.updatedAt))
                .limit(3),
            db
                .select()
                .from(packingProfiles)
                .where(
                    and(
                        eq(packingProfiles.tenantId, tenantId),
                        eq(packingProfiles.isActive, true),
                        or(
                            eq(packingProfiles.id, normalizedQuery),
                            like(packingProfiles.profileName, searchPattern),
                            like(packingProfiles.productRef, searchPattern),
                        ),
                    ),
                )
                .orderBy(desc(packingProfiles.updatedAt))
                .limit(3),
        ]);

        const merged = [...productRows.map(mapProductRow), ...packingRows.map(mapPackingProfileRow)];
        const deduplicated = new Map<string, CatalogProductLookup>();

        for (const product of merged) {
            const key = `${product.name.toLowerCase()}::${product.sku ?? product.productId}`;
            if (!deduplicated.has(key)) {
                deduplicated.set(key, product);
            }
        }

        return Array.from(deduplicated.values()).slice(0, 3);
    },
};
