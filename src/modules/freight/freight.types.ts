/**
 * Freight module types.
 * Defines all types used in the freight calculation module.
 */

import type { AttributionSnapshot } from '../../infra/attribution/attribution.types';

/**
 * Freight calculation request.
 */
export interface FreightRequest {
  destinationCep: string;
  cepDestino?: string;
  zoneCode?: string;
  quantity: number;
  tenantId?: string;
  attribution?: AttributionSnapshot | null;
  requestId?: string;
  unitWeight?: number; // kg (optional, uses default if not provided)
  dimensions?: {
    width: number; // cm
    height: number; // cm
    length: number; // cm
  };
  /** Product slug for packing profile lookup */
  productRef?: string;
  /** Manual operator override — multi-volume rows (dimensions in cm) */
  manualVolumes?: { length: number; width: number; height: number; qty: number }[];
  /** Manual operator override — explicit total weight in kg */
  manualWeight?: number;
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
  source: string; // carrier adapter code (melhorenvio, tabela_movvi, etc.)
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
  /** Source of dimensions: manual_override, packing_profile, request_override, or default */
  dimensionSource?: 'manual_override' | 'packing_profile' | 'request_override' | 'default';
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
