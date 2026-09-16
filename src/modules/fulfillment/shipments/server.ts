/**
 * Fulfillment Shipments Subdomain — Server Entrypoint.
 *
 * Re-exports server-only shipment capabilities for consumers outside the fulfillment module.
 */

export { shipmentService } from './shipment.service';
export { shipmentRepository } from './shipment.repository';
export { shipmentEvents } from './shipment.events';
export type { ShipmentStatus } from './shipment.service';
export type { ShipmentListFilter } from './shipment.repository';

export {
    findFreightShipmentByExternalShipmentId,
    getShipmentById,
    getShipmentsForOrder,
    listFreightShipments,
    updateFreightShipmentStatus,
    linkShipmentToOrder,
    softDeleteFreightShipment,
} from './shipment-linkage.repository';

export { createShipmentFromQuote } from './adapters/melhor-envio-shipment';
export type { CreateShipmentInput } from './adapters/melhor-envio-shipment';
