import { getCustomerWithContext } from './customer.repository';
import type { ClientRecord, ClientStatus, ClientActivityBucket } from './types';
import { db } from '@/db/client';
import { customers, organizations, customerContacts, orders, simulations, crmOpportunities, conversations } from '@/drizzle/schema';
import { eq, desc, sql, ne, and } from 'drizzle-orm';
import { withTenantNotDeleted } from '@/infra/db';

import { decryptString } from '@/infra/pii/crypto';

export async function loadClientsHydrated(tenantId: string): Promise<ClientRecord[]> {
    const dbClients = await db
        .select({
            customer: customers,
            organization: organizations,
        })
        .from(customers)
        .innerJoin(organizations, eq(customers.organizationId, organizations.id))
        .where(and(eq(customers.tenantId, tenantId), ne(organizations.status, 'merged')));

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
        .where(withTenantNotDeleted(orders, tenantId))
        .orderBy(desc(orders.createdAt));

    const allSimulations = await db
        .select()
        .from(simulations)
        .where(eq(simulations.tenantId, tenantId))
        .orderBy(desc(simulations.createdAt));

    const allOpportunities = await db
        .select()
        .from(crmOpportunities)
        .where(withTenantNotDeleted(crmOpportunities, tenantId))
        .orderBy(desc(crmOpportunities.updatedAt));

    const allConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.tenantId, tenantId))
        .orderBy(desc(conversations.lastMessageAt));

    return dbClients.map(({ customer, organization }) => {
        const myContacts = allContacts.filter(c => c.customerId === customer.id);
        const mainContact = myContacts.find(c => c.isPrimary) || myContacts[0];
        
        const myOrders = recentOrders.filter(o => o.customerId === customer.id);
        const mySimulations = allSimulations.filter(s => s.customerId === customer.id);
        const myOps = allOpportunities.filter(o => o.customerId === customer.id);
        const activeOp = myOps.find(o => o.status === 'active') || myOps[0];
        const myConversations = allConversations.filter(c => c.customerId === customer.id);

        // Calc average ticket
        const paidOrders = myOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CONFIRMED' || o.status === 'PROCESSING');
        const totalPaidAmount = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const avgTicketVal = paidOrders.length > 0 ? totalPaidAmount / paidOrders.length : 0;
        const averageTicketStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicketVal);

        // Determine last activity time/interaction
        const dates = [
            customer.updatedAt,
            ...myOrders.map(o => o.updatedAt),
            ...mySimulations.map(s => s.createdAt),
            ...myConversations.map(c => c.lastMessageAt || c.updatedAt)
        ].filter(Boolean) as Date[];

        const lastActivityDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : customer.updatedAt;
        const lastActivityStr = lastActivityDate ? lastActivityDate.toLocaleDateString('pt-BR') : 'Sem registro';

        const timeDiff = Date.now() - lastActivityDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        let lastInteractionStr = 'Recente';
        if (daysDiff > 30) {
            lastInteractionStr = 'Mais de 30 dias';
        } else if (daysDiff > 7) {
            lastInteractionStr = 'Mais de 7 dias';
        } else if (daysDiff > 1) {
            lastInteractionStr = `${daysDiff} dias atrás`;
        } else {
            lastInteractionStr = 'Hoje';
        }

        return {
            id: customer.id,
            name: mainContact?.name || organization.legalName || 'Sem nome',
            company: organization.legalName || 'Sem Empresa',
            contact: mainContact ? `${mainContact.name} • ${mainContact.role || 'Contato'}` : 'Sem contato',
            email: mainContact?.emailEncrypted ? decryptString(mainContact.emailEncrypted) : '',
            phone: mainContact?.phoneEncrypted ? decryptString(mainContact.phoneEncrypted) : '',
            city: myOrders[0]?.service || 'São Paulo (Região)', // Address/City isn't on organizations/customers. Let's use service region or standard default
            segment: customer.segment || 'Geral',
            status: (customer.status as ClientStatus) || 'ativo',
            activityBucket: (customer.activityBucket as ClientActivityBucket) || 'recente',
            lastActivity: lastActivityStr,
            orderCount: myOrders.length,
            conversationCount: myConversations.length,
            simulationCount: mySimulations.length,
            averageTicket: averageTicketStr,
            lastInteraction: lastInteractionStr,
            summary: `Cliente cadastrado em ${customer.createdAt.toLocaleDateString('pt-BR')}`,
            tags: customer.segment ? [customer.segment.toLowerCase()] : ['ativo'],
            conversations: myConversations.slice(0, 5).map(c => ({
                id: c.id,
                channel: 'WhatsApp',
                title: `Conversa via WhatsApp`,
                owner: c.assignedTo || 'Frank',
                status: c.status === 'closed' ? 'resolvida' : 'em-atendimento',
                updatedAt: c.lastMessageAt?.toISOString() || c.updatedAt.toISOString()
            })),
            orders: myOrders.slice(0, 10).map(o => ({
                id: o.id,
                status: o.status === 'DELIVERED' ? 'entregue' : o.status === 'DRAFT' ? 'aguardando-aprovacao' : 'processando',
                total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(o.totalAmount || 0)),
                updatedAt: o.updatedAt?.toISOString() || new Date().toISOString(),
            })),
            simulations: mySimulations.slice(0, 10).map(s => ({
                id: s.id,
                carrier: s.bestCarrier || 'Simulando',
                route: `${s.cep.slice(0, 5) || 'Origem'} > ${s.cep || 'Destino'}`,
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.bestPrice || 0)),
                status: s.bestCarrier ? 'aprovada' : 'pendente',
                updatedAt: s.updatedAt?.toISOString() || s.createdAt?.toISOString() || new Date().toISOString(),
            })),
            opportunity: activeOp ? {
                id: activeOp.id,
                stage: activeOp.stage as any, // CrmStage
                title: activeOp.title,
                amount: activeOp.amount || '0',
                lastActivityAt: activeOp.lastActivityAt?.toISOString() || activeOp.createdAt?.toISOString() || new Date().toISOString()
            } : undefined
        } as ClientRecord;
    });
}
