import { Suspense } from 'react';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { getDb } from '../../../../infra/db';
import {
    dispatchDeliveryOrders,
    dispatchDeliveryRoutes,
    dispatchTechnicians
} from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import DispatchBoardClient from './client-board';

export default async function DispatchPage() {
    const ENABLE_MVP = process.env.DISPATCH_MVP === 'true';

    if (!ENABLE_MVP) {
        return (
            <SettingsPage title="Cockpit Operacional > Last-Mile Dispatch" description="Módulo Restrito">
                <div className="p-8 text-center text-[hsl(var(--ui-text-muted))]">
                    Módulo em Beta Fechado. Feature Flag DISPATCH_MVP inativa.
                </div>
            </SettingsPage>
        );
    }

    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');

    if (!tenantId) return <div>Sem contexto</div>;

    const db = await getDb();

    // 1. Fetch Orders Status counts
    const orders = await db.select({
        id: dispatchDeliveryOrders.id,
        ref: dispatchDeliveryOrders.orderRef,
        status: dispatchDeliveryOrders.status,
        name: dispatchDeliveryOrders.customerName,
        city: dispatchDeliveryOrders.city,
    })
        .from(dispatchDeliveryOrders)
        .where(eq(dispatchDeliveryOrders.tenantId, tenantId));

    // 2. Separate into kanban columns
    const columns = {
        pending: orders.filter(o => o.status === 'pending'),
        routed: orders.filter(o => o.status === 'routed'),
        in_transit: orders.filter(o => o.status === 'in_transit'),
        delivered: orders.filter(o => o.status === 'delivered'),
        failed: orders.filter(o => o.status === 'failed')
    };

    const routes = await db.select({
        id: dispatchDeliveryRoutes.id,
        status: dispatchDeliveryRoutes.status,
        techId: dispatchDeliveryRoutes.technicianId
    })
        .from(dispatchDeliveryRoutes)
        .where(eq(dispatchDeliveryRoutes.tenantId, tenantId));

    // 4. Check for setup
    const techs = await db.select({ id: dispatchTechnicians.id })
        .from(dispatchTechnicians)
        .where(eq(dispatchTechnicians.tenantId, tenantId))
        .limit(1);

    if (techs.length === 0) {
        return (
            <SettingsPage title="DISPATCH" description="Motor visual de roteirização e entregas logísticas.">
                <div className="flex flex-col items-center justify-center py-20 bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))]">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent mb-2">SETUP INCOMPLETO</h2>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] max-w-sm text-center mb-6">Você precisa ter ao menos um Técnico Parceiro cadastrado para poder gerar rotas locais e despachar os pedidos.</p>
                    <a href="/cockpit/dispatch/technicians" className="bg-[hsl(var(--ui-primary))] text-[hsl(var(--ui-primary-foreground))] font-semibold rounded-lg px-6 py-3 shadow hover:opacity-90 transition-opacity">
                        CADASTRAR TÉCNICOS
                    </a>
                </div>
            </SettingsPage>
        );
    }

    return (
        <SettingsPage
            title="Last-Mile Dispatch"
            description="Motor visual de roteirização e entregas logísticas."
        >
            <Suspense fallback={<div>Carregando board...</div>}>
                <DispatchBoardClient initialData={columns} routes={routes} />
            </Suspense>
        </SettingsPage>
    );
}
