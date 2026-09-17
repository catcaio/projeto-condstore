/**
 * Fulfillment Freight Subdomain — Server Entrypoint.
 *
 * Re-exports server-only freight capabilities for consumers outside the fulfillment module.
 */

export { freightService } from './freight.service';
export { freightController } from './freight.controller';
export { unifiedQuoteEngine, UnifiedQuoteEngine, MelhorEnvioAdapter, TabelaAdapter } from './quote-engine';
export { getQuoteContext } from './quote-context.repository';
export {
    logFreightSimulation,
    confirmFreight,
    upsertFreightMemory,
    computeWeightBand,
    computeVolumeBand,
} from './freight-audit';
export { resolvePackingDimensions } from './packing-resolver';
export { selectCarrierStrategy } from './carrier-router';
export { resolveFreightMemory, generateRecommendation } from './memory/memory-resolver';
export { TableDrivenAdapter, getTableAdaptersForDestination } from './table-driven-adapter';
export type { FreightRequest, FreightOption, FreightResult, WeightDecision } from './freight.types';
