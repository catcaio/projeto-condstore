import { notFound } from 'next/navigation';
import { getDb } from '../../../../infra/db';
import { dispatchDeliveryOrders, dispatchDeliveryEvents } from '../../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { MapPin, Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/ui/components';

export default async function TrackingPage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const db = await getDb();

    // Find Order by token
    const [order] = await db.select()
        .from(dispatchDeliveryOrders)
        .where(eq(dispatchDeliveryOrders.trackingToken, params.token))
        .limit(1);

    if (!order) {
        notFound();
    }

    // Find Events
    const events = await db.select()
        .from(dispatchDeliveryEvents)
        .where(eq(dispatchDeliveryEvents.orderId, order.id))
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

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center font-sans antialiased">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Rastreio de Pedido</h1>
                    <p className="text-gray-500 text-sm">Destinatário: {order.customerName}</p>
                    <p className="text-gray-500 text-sm">Ref: {order.orderRef}</p>
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
