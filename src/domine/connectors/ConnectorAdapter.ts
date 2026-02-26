import { ConnectorCapability } from "./ConnectorCapability";

export interface ConnectorContext {
    tenantId: string;
    idempotencyKey: string;
    source: string;
    occurredAt: string;
}

export interface ConnectorAdapter {
    id: string;
    name: string;
    capabilities: ConnectorCapability[];
    initialize(context: ConnectorContext): Promise<void>;
    healthCheck(context: ConnectorContext): Promise<boolean>;
    sync(context: ConnectorContext): Promise<void>; // Basic general sync
}
