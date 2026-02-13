/**
 * Freight module types.
 * Defines all types used in the freight calculation module.
 */

/**
 * Freight calculation request.
 */
export interface FreightRequest {
  destinationCep: string;
  quantity: number;
  unitWeight?: number; // kg (optional, uses default if not provided)
  dimensions?: {
    width: number; // cm
    height: number; // cm
    length: number; // cm
  };
}

/**
 * Freight option returned by the service.
 */
export interface FreightOption {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryTime: number; // days
  source: 'melhorenvio' | 'tabela';
}

/**
 * Freight calculation result.
 */
export interface FreightResult {
  success: boolean;
  options: FreightOption[];
  totalWeight: number; // kg
  request: FreightRequest;
  calculatedAt: Date;
  error?: string;
}

/**
 * Freight decision strategy.
 */
export enum FreightStrategy {
  MELHORENVIO_ONLY = 'MELHORENVIO_ONLY',       // ≤10kg
  BOTH = 'BOTH',                                 // 10-15kg
  TABELA_ONLY = 'TABELA_ONLY',                   // >15kg
}

/**
 * Weight-based decision result.
 */
export interface WeightDecision {
  totalWeight: number;
  strategy: FreightStrategy;
  reason: string;
}
