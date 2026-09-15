/**
 * Fulfillment Shipments Subdomain — Server Entrypoint.
 */

export { shipmentService } from './shipment.service';
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
