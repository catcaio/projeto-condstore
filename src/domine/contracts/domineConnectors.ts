import { ConnectorCapability } from "../connectors/ConnectorCapability";

export interface DomineConnectorInfo {
    id: string;
    name: string;
    capabilities: ConnectorCapability[];
    status: "HEALTHY" | "UNHEALTHY" | "NOT_CONFIGURED";
    lastSyncAt?: string;
}

export interface DomineConnectorsPayload {
    tenantId: string;
    connectors: DomineConnectorInfo[];
}
