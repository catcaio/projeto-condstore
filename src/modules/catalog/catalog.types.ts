export interface ProductQuery {
  tenantId: string;
  query: string;
}

export interface ProductResult {
  id: string;
  name: string;
  sku: string | null;
  dimensions: {
    width: number | null;
    height: number | null;
    length: number | null;
  };
  weight: number;
  price: number;
}
