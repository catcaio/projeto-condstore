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
        token: dispatchDeliveryOrders.trackingToken
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

    // 3. Fetch Active routes
    const routes = await db.select({
        id: dispatchDeliveryRoutes.id,
        status: dispatchDeliveryRoutes.status,
        techId: dispatchDeliveryRoutes.technicianId
    })
        .from(dispatchDeliveryRoutes)
        .where(eq(dispatchDeliveryRoutes.tenantId, tenantId));

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
