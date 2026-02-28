import { getDb } from '../../infra/db';
import {
    dispatchDeliveryRoutes,
    dispatchDeliveryRouteStops,
    dispatchDeliveryOrders,
    dispatchTechnicians
} from '../../drizzle/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import TechClientApp from './tech-client-app';

export default async function TechPage() {
    const ENABLE_MVP = process.env.DISPATCH_MVP === 'true';

    if (!ENABLE_MVP) {
        return <div className="p-8 text-center text-gray-500 font-sans">Condstore Dispatch inativo.</div>;
    }

    const headersList = await headers();
    // Assuming this is used on devices logged into tenant context for now OR parameterized.
    // MVP: Force basic matching if needed. For real PWA we'd use JWT tokens. We'll use mocked tenant logic fallback for MVP demonstration.
    const tenantId = headersList.get('x-auth-tenant-id') || '415f3337-67ad-45dd-a8b4-4e4b51a0b3ea'; // Fallback to a known dev tenant ID or require login

    const db = await getDb();

    // 1. Get today's active routes for this tenant (MVP assumes 1 active technician viewing their route, we just fetch any pending route for MVP demonstration)
    const targetDate = new Date(); // Today

    const activeRoutes = await db.select({
        id: dispatchDeliveryRoutes.id,
        technicianId: dispatchDeliveryRoutes.technicianId,
        status: dispatchDeliveryRoutes.status,
    })
        .from(dispatchDeliveryRoutes)
        .where(and(
            eq(dispatchDeliveryRoutes.tenantId, tenantId),
            inArray(dispatchDeliveryRoutes.status, ['pending', 'in_progress'])
        ))
        .limit(1); // MVP: Just grab the first pending route

    if (activeRoutes.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-sm w-full border border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Sem Rotas</h1>
                    <p className="text-gray-500 text-sm">Nenhuma rota programada para você hoje.</p>
                </div>
            </div>
        );
    }

    const route = activeRoutes[0];

    // 2. Fetch stops for this route
    const stopsRaw = await db.select({
        stopId: dispatchDeliveryRouteStops.id,
        orderId: dispatchDeliveryRouteStops.orderId,
        sequence: dispatchDeliveryRouteStops.sequenceIndex,
        status: dispatchDeliveryRouteStops.status,
        customerName: dispatchDeliveryOrders.customerName,
        address: dispatchDeliveryOrders.addressLine,
        city: dispatchDeliveryOrders.city,
        zip: dispatchDeliveryOrders.zipCode,
        phone: dispatchDeliveryOrders.customerPhone,
        ref: dispatchDeliveryOrders.orderRef
    })
        .from(dispatchDeliveryRouteStops)
        .innerJoin(dispatchDeliveryOrders, eq(dispatchDeliveryOrders.id, dispatchDeliveryRouteStops.orderId))
        .where(eq(dispatchDeliveryRouteStops.routeId, route.id))
        .orderBy(asc(dispatchDeliveryRouteStops.sequenceIndex));

    return (
        <div className="min-h-screen bg-black sm:bg-gray-100 flex justify-center font-sans">
            <div className="w-full max-w-md bg-gray-50 min-h-screen sm:shadow-lg sm:my-8 sm:rounded-[2.5rem] overflow-hidden relative border-x-4 sm:border-8 border-black flex flex-col">
                {/* Header App-like */}
                <div className="bg-white px-6 py-5 border-b border-gray-100 sticky top-0 z-10 shrink-0">
                    <h1 className="text-xl font-bold text-gray-900">Rota Diária</h1>
                    <p className="text-xs text-gray-500 font-medium">#{route.id.split('-').pop()?.toUpperCase()}</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TechClientApp routeId={route.id} tenantId={tenantId} stops={stopsRaw} />
                </div>
            </div>
        </div>
    );
}
