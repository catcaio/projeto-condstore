import type { OrderRecord, OrderStatus, OrderPriority, OrderChannel, OrderPeriodBucket } from './types';
import { db } from '@/db/client';
import { orders, customers, organizations, freightShipments } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function loadOrdersHydrated(tenantId: string): Promise<OrderRecord[]> {
    console.info("DEBUG loadOrdersHydrated. orders:", !!orders, "customers:", !!customers, "orgs:", !!organizations, "freightShipments:", !!freightShipments);
    let dbOrders: any[] = [];
    try {
        dbOrders = await db
            .select({
                order: orders,
                customer: customers,
                organization: organizations,
                shipment: freightShipments,
            })
            .from(orders)
            .innerJoin(customers, eq(orders.customerId, customers.id))
            .innerJoin(organizations, eq(customers.organizationId, organizations.id))
            .leftJoin(freightShipments, eq(freightShipments.orderId, orders.id))
            .where(eq(orders.tenantId, tenantId))
            .orderBy(orders.createdAt);
    } catch (e: any) {
        // Return exactly one fake order containing the error message in its ID so we can see it in the UI!
        return [{
            id: 'ERROR: ' + e.message,
            customer: {
                id: 'err', name: 'Error', company: 'Err', contact: '', email: '', phone: '', city: '', segment: '', status: '', activityBucket: '', lastActivity: '', orderCount: 0, conversationCount: 0, simulationCount: 0, averageTicket: '', lastInteraction: '', summary: '', tags: [], conversations: [], orders: [], simulations: []
            },
            status: 'recebido', priority: 'media', channel: 'Portal', owner: '', total: '', aging: '', updatedAt: '', periodBucket: 'hoje', origin: '', createdAt: '', items: [], timeline: [], events: [], logistics: { carrier: '', mode: '', logisticsStatus: 'aguardando-cotacao', forecast: '', quoteId: '' }
        }] as any;
    }

    if (dbOrders.length === 0) {
        return [];
    }

    return dbOrders.map(({ order, organization, shipment }) => {
        return {
            id: order.id,
            customer: {
                id: organization.id,
                name: organization.legalName || 'Sem nome',
                company: organization.legalName || 'Sem Empresa',
                contact: 'Contato Padrão',
                email: 'contato@db.net',
                phone: '',
                city: 'Definir',
                segment: 'Geral',
                status: 'ativo',
                activityBucket: 'hoje',
                lastActivity: 'Atualizado DB',
                orderCount: 1,
                conversationCount: 0,
                simulationCount: 0,
                averageTicket: 'R$ 0,00',
                lastInteraction: 'Recente',
                summary: 'Mock Summary',
                tags: ['db-real'],
                conversations: [],
                orders: [],
                simulations: [],
            },
            status: (order.status as OrderStatus) || 'recebido',
            priority: (order.priority as OrderPriority) || 'media',
            channel: (order.channel as OrderChannel) || 'Portal',
            owner: order.ownerId || 'N/A',
            total: `R$ ${order.totalAmount || '0,00'}`,
            aging: 'Novo',
            updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
            periodBucket: 'hoje',
            origin: 'DB',
            createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
            items: [],
            timeline: [
                { label: 'recebido', state: 'completed', timestamp: 'Agora' }
            ],
            events: [],
            logistics: {
                carrier: shipment?.carrier || 'Não Definida',
                mode: shipment?.service || 'Rodoviario',
                logisticsStatus: shipment?.status || 'aguardando-cotacao',
                forecast: 'N/A',
                quoteId: order.freightSimulationId || '',
            }
        } as OrderRecord;
    });
}
