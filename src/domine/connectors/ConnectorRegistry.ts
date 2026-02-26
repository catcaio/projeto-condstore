import { ConnectorAdapter } from "./ConnectorAdapter";
import { MockConnector } from "./mocks/MockConnector";

export class ConnectorRegistry {
    private connectors = new Map<string, ConnectorAdapter>();

    constructor() {
        this.register(new MockConnector());
    }

    register(connector: ConnectorAdapter): void {
        this.connectors.set(connector.id, connector);
    }

    get(id: string): ConnectorAdapter | undefined {
        return this.connectors.get(id);
    }

    list(): ConnectorAdapter[] {
        return Array.from(this.connectors.values());
    }
}

export const globalConnectorRegistry = new ConnectorRegistry();
