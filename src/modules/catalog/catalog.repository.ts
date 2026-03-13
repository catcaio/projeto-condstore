import { db } from '../../db/client';
import { products } from '../../drizzle/schema';
import { eq, and, like, or } from 'drizzle-orm';
import { ProductResult } from './catalog.types';

export const catalogRepository = {
  async searchProductsByName(tenantId: string, query: string): Promise<ProductResult[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db.select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          or(
            like(products.name, searchTerm),
            like(products.sku, searchTerm)
          )
        )
      )
      .limit(5);

    return results.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      dimensions: {
        width: row.width ? parseFloat(row.width as any) : null,
        height: row.height ? parseFloat(row.height as any) : null,
        length: row.length ? parseFloat(row.length as any) : null,
      },
      weight: parseFloat(row.weight as any),
      price: parseFloat(row.price as any)
    }));
  }
};
