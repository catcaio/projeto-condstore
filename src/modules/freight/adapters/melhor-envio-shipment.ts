/**
 * Melhor Envio Shipment Adapter
 * 
 * Handles label generation via the Melhor Envio API.
 */

import { logger } from '../../../infra/logger';
import { getDb } from '../../../infra/db';
import { freightShipments } from '../../../drizzle/schema';
import { randomUUID } from 'crypto';
import { secretResolver } from '../../../infra/security/secret-resolver';

export interface RecipientData {
    name: string;
    phone: string;
    email: string;
    document: string; // CPF or CNPJ
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    stateAbbr: string;
    countryId: string; // 'BR'
    postalCode: string;
}

export interface PackageDimensions {
    weight: number; // kg
    width: number;  // cm
    height: number; // cm
    length: number; // cm
}

export interface CreateShipmentInput {
    tenantId: string;
    simulationId: string;
    serviceId: number; // Service ID from Melhor Envio quote (e.g. 1 for PAC)
    carrierName: string;
    serviceName: string;
    quotePrice: number;
    dimensions: PackageDimensions;
    recipient: RecipientData;
    originCep: string;
}

export interface CreateShipmentResult {
    shipmentId: string;
    trackingCode: string;
    trackingUrl: string;
    price: number;
    status: string;
}

export async function createShipmentFromQuote(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const token = await secretResolver.getValue(input.tenantId, 'melhorenvio', 'MELHOR_ENVIO_TOKEN', 'MELHOR_ENVIO_TOKEN');

    if (!token) {
        throw new Error('MELHOR_ENVIO_TOKEN not configured');
    }

    const apiUrl = await secretResolver.getValue(input.tenantId, 'melhorenvio', 'MELHOR_ENVIO_API_URL', 'MELHOR_ENVIO_API_URL')
        .catch(() => 'https://melhorenvio.com.br/api/v2');
    const ME_API_URL = `${apiUrl}/me/cart`;

    const getSafeVal = async (key: string, def: string = '') => 
        secretResolver.getValue(input.tenantId, 'melhorenvio', key, key).catch(() => def);

    const fromName = await getSafeVal('MELHOR_ENVIO_FROM_NAME', 'CONDSTORE OS');
    const fromEmail = await getSafeVal('MELHOR_ENVIO_FROM_EMAIL', 'contato@condstore.com.br');
    const fromPhone = await getSafeVal('MELHOR_ENVIO_FROM_PHONE', '48999999999');
    const fromDocument = await getSafeVal('MELHOR_ENVIO_FROM_DOCUMENT');
    const fromCompanyDocument = await getSafeVal('MELHOR_ENVIO_FROM_COMPANY_DOCUMENT');
    const fromPostalCode = await getSafeVal('MELHOR_ENVIO_FROM_POSTAL_CODE');
    const fromAddress = await getSafeVal('MELHOR_ENVIO_FROM_ADDRESS');
    const fromNumber = await getSafeVal('MELHOR_ENVIO_FROM_NUMBER');
    const fromComplement = await getSafeVal('MELHOR_ENVIO_FROM_COMPLEMENT');
    const fromDistrict = await getSafeVal('MELHOR_ENVIO_FROM_DISTRICT');
    const fromCity = await getSafeVal('MELHOR_ENVIO_FROM_CITY');
    const fromState = await getSafeVal('MELHOR_ENVIO_FROM_STATE');

    if (!fromPostalCode || !fromAddress || !fromNumber || !fromDistrict || !fromCity || !fromState) {
        throw new Error('Missing required ME sender address fields in environment variables.');
    }
    if (!fromDocument && !fromCompanyDocument) {
        throw new Error('At least one of MELHOR_ENVIO_FROM_DOCUMENT or MELHOR_ENVIO_FROM_COMPANY_DOCUMENT must be provided.');
    }

    const cleanDoc = fromDocument?.replace(/\D/g, '') || '';
    const cleanCnpj = fromCompanyDocument?.replace(/\D/g, '') || '';

    if (fromDocument && cleanDoc.length !== 11) throw new Error('MELHOR_ENVIO_FROM_DOCUMENT must be a valid 11-digit CPF format.');
    if (fromCompanyDocument && cleanCnpj.length !== 14) throw new Error('MELHOR_ENVIO_FROM_COMPANY_DOCUMENT must be a valid 14-digit CNPJ format.');

    try {
        const payload = {
            service: input.serviceId,
            agency: 1, // Store default agency
            from: {
                name: fromName,
                phone: fromPhone,
                email: fromEmail,
                document: cleanDoc || cleanCnpj,
                ...(cleanCnpj ? { company_document: cleanCnpj } : {}),
                state_register: '',
                address: fromAddress,
                complement: fromComplement,
                number: fromNumber,
                district: fromDistrict,
                city: fromCity,
                state_abbr: fromState,
                country_id: 'BR',
                postal_code: fromPostalCode.replace(/\D/g, ''),
                note: '',
            },
            to: {
                name: input.recipient.name,
                phone: input.recipient.phone,
                email: input.recipient.email,
                document: input.recipient.document,
                company_document: input.recipient.document.length > 11 ? input.recipient.document : '',
                state_register: '',
                address: input.recipient.address,
                complement: input.recipient.complement || '',
                number: input.recipient.number,
                district: input.recipient.district,
                city: input.recipient.city,
                state_abbr: input.recipient.stateAbbr,
                country_id: input.recipient.countryId,
                postal_code: input.recipient.postalCode.replace(/\D/g, ''),
                note: '',
            },
            products: [
                {
                    name: `Pedido Simulação ${input.simulationId}`,
                    quantity: 1,
                    unitary_value: 100.00, // Dummy value
                }
            ],
            package: {
                weight: input.dimensions.weight,
                width: Math.max(input.dimensions.width, 11),
                height: Math.max(input.dimensions.height, 2),
                length: Math.max(input.dimensions.length, 16),
            },
            options: {
                insurance_value: 100.00, // Dummy value
                receipt: false,
                own_hand: false,
                reverse: false,
                non_commercial: true,
            }
        };

        const res = await fetch(ME_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CondStore/1.0',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errParam = new Error(`Melhor Envio API error: ${res.status}`);
            (errParam as any).details = errorData;
            logger.error('melhor_envio_shipment: API error', errParam);
            throw errParam;
        }

        const data: any = await res.json();

        // Checkout the cart immediately to generate the label
        const checkoutRes = await fetch(`${apiUrl}/me/shipment/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CondStore/1.0',
            },
            body: JSON.stringify({
                orders: [data.id]
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!checkoutRes.ok) {
            throw new Error(`Melhor Envio Checkout error: ${checkoutRes.status}`);
        }

        // Fetch the created order to get the tracking code
        const printRes = await fetch(`${apiUrl}/me/shipment/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CondStore/1.0',
            },
            body: JSON.stringify({
                mode: 'public',
                orders: [data.id]
            }),
            signal: AbortSignal.timeout(10000),
        });

        const printData: any = await printRes.json().catch(() => ({}));

        const shipmentId = randomUUID();
        const trackingCode = data.tracking || `SIM-${data.id}`;

        // Persist DB
        const db = await getDb();
        await db.insert(freightShipments).values({
            id: shipmentId,
            tenantId: input.tenantId,
            simulationId: input.simulationId,
            carrier: input.carrierName,
            service: input.serviceName,
            externalShipmentId: String(data.id),
            trackingCode: trackingCode,
            shipmentPrice: String(data.price || input.quotePrice),
            status: data.status || 'pending',
        });

        logger.info('melhor_envio_shipment: shipment created', {
            shipmentId,
            trackingCode,
            meOrderId: data.id,
        });

        return {
            shipmentId,
            trackingCode,
            trackingUrl: `${apiUrl.replace('/api/v2', '')}/rastreio/${trackingCode}`,
            price: data.price ? parseFloat(data.price) : input.quotePrice,
            status: data.status || 'pending',
        };

    } catch (err) {
        logger.error('melhor_envio_shipment: failed to create shipment', err instanceof Error ? err : undefined);
        throw err;
    }
}
