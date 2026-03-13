import { catalogRepository } from './catalog.repository';
import { ProductResult, ProductQuery } from './catalog.types';
import { logger } from '../../infra/logger';

class CatalogService {
  async searchProductsByName(tenantId: string, query: string): Promise<ProductResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    try {
      return await catalogRepository.searchProductsByName(tenantId, query.trim());
    } catch (error) {
      logger.error('Failed to search products', error as Error, { tenantId, query });
      return [];
    }
  }
}

export const catalogService = new CatalogService();
