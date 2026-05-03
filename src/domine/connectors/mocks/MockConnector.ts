import { logger } from "../../../infra/logger";
import { ConnectorAdapter, ConnectorContext } from "../ConnectorAdapter";
import { ConnectorCapability } from "../ConnectorCapability";

export class MockConnector implements ConnectorAdapter {
    id = "mock-connector-1";
    name = "Mock ERP Connector";
    capabilities = [ConnectorCapability.OMS, ConnectorCapability.FISCAL];

    async initialize(context: ConnectorContext): Promise<void> {
        logger.info("[MockConnector] Initialized", {
            source: context.source,
        });
    }

    async healthCheck(context: ConnectorContext): Promise<boolean> {
        return true;
    }

    async sync(context: ConnectorContext): Promise<void> {
        logger.info("[MockConnector] Sync triggered", {
            occurredAt: context.occurredAt,
            source: context.source,
        });
    }
}
