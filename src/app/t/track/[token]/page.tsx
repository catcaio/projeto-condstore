import { notFound } from 'next/navigation';
import { getDb } from '../../../../infra/db';
import { dispatchDeliveryOrders, dispatchDeliveryEvents } from '../../../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { MapPin, Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/ui/components';
import crypto from 'crypto';

export default async function TrackingPage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const db = await getDb();

    // 1. Hash the public token to find the record securely
    const tokenHash = crypto.createHash('sha256').update(params.token).digest('hex');

    // 2. Find Order by Hash safely. (Explicitly select ONLY what is needed)
    const [order] = await db.select({
        id: dispatchDeliveryOrders.id,
        tenantId: dispatchDeliveryOrders.tenantId, // needed for fetching events safely
        customerName: dispatchDeliveryOrders.customerName,
        city: dispatchDeliveryOrders.city,
        state: dispatchDeliveryOrders.state,
        status: dispatchDeliveryOrders.status,
        expiresAt: dispatchDeliveryOrders.trackingTokenExpiresAt
    })
        .from(dispatchDeliveryOrders)
        .where(eq(dispatchDeliveryOrders.trackingTokenHash, tokenHash))
        .limit(1);

    if (!order) {
        notFound();
    }

    // 3. Expiry check
    if (new Date() > new Date(order.expiresAt)) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expirado</h1>
                <p className="text-gray-500">Este link de rastreamento perdeu a validade.</p>
            </div>
        );
    }

    // 4. Find Events securely binding tenant
    const events = await db.select({
        id: dispatchDeliveryEvents.id,
        status: dispatchDeliveryEvents.status,
        description: dispatchDeliveryEvents.description,
        createdAt: dispatchDeliveryEvents.createdAt
    })
        .from(dispatchDeliveryEvents)
        .where(
            and(
                eq(dispatchDeliveryEvents.orderId, order.id),
                eq(dispatchDeliveryEvents.tenantId, order.tenantId) // Tenant boundary defense
            )
        )
        .orderBy(desc(dispatchDeliveryEvents.createdAt));

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
            case 'created':
                return <Clock className="w-5 h-5 text-gray-400" />;
            case 'routed':
                return <MapPin className="w-5 h-5 text-blue-500" />;
            case 'in_transit':
            case 'out_for_delivery':
                return <Package className="w-5 h-5 text-amber-500" />;
            case 'delivered':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed':
            case 'attempt_failed':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getBadgeVariant = (status: string) => {
        if (status === 'delivered') return 'success';
        if (status === 'failed') return 'danger';
        if (status === 'pending') return 'muted';
        return 'warning';
    };

    const StatusNameMap: Record<string, string> = {
        'pending': 'Pendente',
        'routed': 'Roteirizado',
        'in_transit': 'Em Rota',
        'delivered': 'Entregue',
        'failed': 'Falhou / Retornado'
    };

    // Note: NEVER render raw `order.id` globally.
    // Ensure display name is masked partially or at least not showing PII
    const safeName = order.customerName.split(' ')[0] + ' ' + (order.customerName.split(' ')[1] ? order.customerName.split(' ')[1][0] + '.' : '');

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center font-sans antialiased">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Rastreio Local</h1>
                    <p className="text-gray-500 text-sm">Destinatário: {safeName}</p>
                    <p className="text-gray-500 text-sm">Região: {order.city} - {order.state}</p>
                    <div className="mt-4">
                        <Badge variant={getBadgeVariant(order.status) as any}>{StatusNameMap[order.status] || order.status}</Badge>
                    </div>
                </div>

                <div className="space-y-6">
                    {events.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 italic">Nenhum evento registrado ainda.</p>
                    ) : (
                        events.map((ev, index) => (
                            <div key={ev.id} className="relative flex gap-4">
                                {/* Timeline line */}
                                {index !== events.length - 1 && (
                                    <div className="absolute top-8 left-[11px] bottom-[-24px] w-[2px] bg-gray-100" />
                                )}

                                <div className="shrink-0 z-10 bg-white shadow-sm ring-1 ring-gray-100 rounded-full w-6 h-6 flex items-center justify-center mt-1">
                                    {getStatusIcon(ev.status)}
                                </div>
                                <div className="flex-1 pb-4">
                                    <p className="font-semibold text-gray-900 text-sm">{StatusNameMap[ev.status] || ev.status}</p>
                                    <p className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleString('pt-BR')}</p>
                                    {ev.description && (
                                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">{ev.description}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
