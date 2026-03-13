import { getCustomerWithContext } from './customer.repository';
import type { ClientRecord, ClientStatus, ClientActivityBucket } from './types';
import { db } from '@/db/client';
import { customers, organizations, customerContacts, orders, freightSimulations } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

import { decryptString } from '@/infra/pii/crypto';

export async function loadMockClientsHydrated(tenantId: string): Promise<ClientRecord[]> {
    const dbClients = await db
        .select({
            customer: customers,
            organization: organizations,
        })
        .from(customers)
        .innerJoin(organizations, eq(customers.organizationId, organizations.id))
        .where(eq(customers.tenantId, tenantId));

    if (dbClients.length === 0) {
        return [];
    }

    const allContacts = await db
        .select()
        .from(customerContacts)
        .where(eq(customerContacts.tenantId, tenantId));

    const recentOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.tenantId, tenantId))
        .orderBy(desc(orders.createdAt));

    const allSimulations = await db
        .select()
        .from(freightSimulations)
        .where(eq(freightSimulations.tenantId, tenantId))
        .orderBy(desc(freightSimulations.createdAt));

    return dbClients.map(({ customer, organization }) => {
        const myContacts = allContacts.filter(c => c.customerId === customer.id);
        const mainContact = myContacts.find(c => c.isPrimary) || myContacts[0];
        
        const myOrders = recentOrders.filter(o => o.customerId === customer.id).slice(0, 10);
        const mySimulations = allSimulations.slice(0, 10);

        return {
            id: customer.id,
            name: mainContact?.name || organization.legalName || 'Sem nome',
            company: organization.legalName || 'Sem Empresa',
            contact: mainContact ? `${mainContact.name} • ${mainContact.role || 'Contato'}` : 'Sem contato',
            email: mainContact?.emailEncrypted ? decryptString(mainContact.emailEncrypted) : '',
            phone: mainContact?.phoneEncrypted ? decryptString(mainContact.phoneEncrypted) : '',
            city: 'Definir (DB)', 
            segment: customer.segment || 'Geral',
            status: (customer.status as ClientStatus) || 'ativo',
            activityBucket: (customer.activityBucket as ClientActivityBucket) || 'recente',
            lastActivity: 'Atualizado DB',
            orderCount: myOrders.length,
            conversationCount: 0,
            simulationCount: mySimulations.length,
            averageTicket: 'R$ 0,00',
            lastInteraction: 'Recente',
            summary: `Cliente importado do DB: ${organization.legalName}`,
            tags: ['db-real'],
            conversations: [], 
            orders: myOrders.map(o => ({
                id: o.id,
                status: (o.status as any) || 'processando',
                total: `R$ ${o.totalAmount || '0,00'}`,
                updatedAt: o.updatedAt?.toISOString() || new Date().toISOString(),
            })),
            simulations: mySimulations.map(s => ({
                id: s.id,
                carrier: s.carrierSelected || 'Simulando',
                route: `${s.cepPrefix || 'Origem'} > ${s.cep || 'Destino'}`,
                value: `R$ ${s.quotedFreight || '0,00'}`,
                status: s.carrierSelected ? 'cotacao_enviada' : 'pendente',
                updatedAt: s.createdAt?.toISOString() || new Date().toISOString(),
            })),
        } as ClientRecord;
    });
}
