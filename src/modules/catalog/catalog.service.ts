import { and, desc, eq, like } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { carrierRateRows, packingProfiles } from '@/drizzle/schema';

export interface CatalogProductMatch {
    productId: string;
    name: string;
    weight: number;
    volume: number;
    basePrice: number;
}

export const catalogService = {
    async searchProductsByName(tenantId: string, query: string): Promise<CatalogProductMatch[]> {
        const db = await getDb();
        const q = query.trim();
        if (!q) return [];

        const rows = await db
            .select()
            .from(packingProfiles)
            .where(
                and(
                    eq(packingProfiles.tenantId, tenantId),
                    eq(packingProfiles.isActive, true),
                    like(packingProfiles.profileName, `%${q}%`),
                ),
            )
            .orderBy(desc(packingProfiles.updatedAt))
            .limit(3);

        if (!rows.length) return [];

        const [minRate] = await db
            .select({ basePrice: carrierRateRows.basePrice })
            .from(carrierRateRows)
            .where(eq(carrierRateRows.tenantId, tenantId))
            .orderBy(carrierRateRows.basePrice)
            .limit(1);

        const fallbackBasePrice = Number(minRate?.basePrice ?? 0);

        return rows.map((row) => {
            const height = Number(row.baseHeight);
            const width = Number(row.baseWidth);
            const length = Number(row.baseLength);
            const volume = Number(((height * width * length) / 1000000).toFixed(4));

            return {
                productId: row.productRef || row.id,
                name: row.profileName,
                weight: Number(row.baseWeight),
                volume,
                basePrice: fallbackBasePrice,
            };
        });
    },
};
