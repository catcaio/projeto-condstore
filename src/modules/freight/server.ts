/**
 * Freight Module — Server Entrypoint.
 *
 * Re-exports server-only symbols for consumers outside the freight module.
 * Use `@/modules/freight/server` to import these.
 */

// ── Repository exports for cross-module consumers ────────────────────
export { getQuoteContext } from './quote-context.repository';
export {
    findFreightShipmentByExternalShipmentId,
    getShipmentById,
    getShipmentsForOrder,
    listFreightShipments,
    updateFreightShipmentStatus,
} from './shipment-linkage.repository';

// ── Adapter exports for app routes ───────────────────────────────────
export { createShipmentFromQuote } from './adapters/melhor-envio-shipment';
export type { CreateShipmentInput } from './adapters/melhor-envio-shipment';
