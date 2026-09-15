export { loadOrdersHydrated } from './order.loader';
export { createOrderFromSimulation } from './order.service';

// ── Read-only repository exports for cross-module consumers ──────────
export {
    getRecentOrdersForCustomer,
    getOrderAggregate,
    findOrderWithShipmentByPrefix,
} from './order.repository';
