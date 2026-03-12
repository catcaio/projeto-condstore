import type { FreightShipmentRecord } from '@/drizzle/schema';
import { findCustomerReferenceByPhone } from '@/modules/clientes/customer.repository';

const DEFAULT_SUPPORT_LIMIT = 5;

export interface ShipmentSummary {
    shipmentId: string;
    carrier: string;
    service: string;
    trackingCode: string | null;
    status: string;
    updatedAt: Date;
}

export interface ResolvedCustomerReference {
    customerId: string;
    organizationId: string | null;
}

export function clampSupportLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
        return DEFAULT_SUPPORT_LIMIT;
    }

    return Math.max(1, Math.min(Math.trunc(limit as number), DEFAULT_SUPPORT_LIMIT));
}

export async function resolveFrankCustomerReference(params: {
    tenantId: string;
    customerId?: string | null;
    sessionCustomerId?: string | null;
    phone?: string | null;
}): Promise<ResolvedCustomerReference | null> {
    if (params.customerId?.trim()) {
        return {
            customerId: params.customerId,
            organizationId: null,
        };
    }

    if (params.sessionCustomerId?.trim()) {
        return {
            customerId: params.sessionCustomerId,
            organizationId: null,
        };
    }

    if (!params.phone?.trim()) {
        return null;
    }

    return findCustomerReferenceByPhone(params.tenantId, params.phone);
}

export function selectLatestShipment(
    shipments: FreightShipmentRecord[],
): FreightShipmentRecord | null {
    if (shipments.length === 0) {
        return null;
    }

    return [...shipments].sort((left, right) => {
        return right.updatedAt.getTime() - left.updatedAt.getTime();
    })[0] ?? null;
}

export function toShipmentSummary(
    shipment: FreightShipmentRecord | null | undefined,
): ShipmentSummary | null {
    if (!shipment) {
        return null;
    }

    return {
        shipmentId: shipment.id,
        carrier: shipment.carrier,
        service: shipment.service,
        trackingCode: shipment.trackingCode,
        status: shipment.status,
        updatedAt: shipment.updatedAt,
    };
}

export function buildQuoteRouteSummary(params: {
    cep?: string | null;
    zoneCode?: string | null;
}): string {
    if (params.cep && params.zoneCode) {
        return `Destino ${params.cep} • zona ${params.zoneCode}`;
    }

    if (params.cep) {
        return `Destino ${params.cep}`;
    }

    return 'Rota indisponivel';
}
