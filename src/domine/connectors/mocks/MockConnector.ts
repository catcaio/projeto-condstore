import { ConnectorAdapter, ConnectorContext } from "../ConnectorAdapter";
import { ConnectorCapability } from "../ConnectorCapability";

export class MockConnector implements ConnectorAdapter {
    id = "mock-connector-1";
    name = "Mock ERP Connector";
    capabilities = [ConnectorCapability.OMS, ConnectorCapability.FISCAL];

    async initialize(context: ConnectorContext): Promise<void> {
        console.log(`[MockConnector] Initialized for tenant: ${context.tenantId} with idempotency key: ${context.idempotencyKey}`);
    }

    async healthCheck(context: ConnectorContext): Promise<boolean> {
        return true;
    }

    async sync(context: ConnectorContext): Promise<void> {
        console.log(`[MockConnector] Sync triggered at ${context.occurredAt} from source: ${context.source}`);
    }
}
