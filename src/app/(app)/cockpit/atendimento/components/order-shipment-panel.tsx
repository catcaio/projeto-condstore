'use client';

import { useState, useEffect } from 'react';
import { Package, Truck, ExternalLink, RefreshCw } from 'lucide-react';
import { DynamicFieldsRenderer } from '@/ui/cockpit/custom-fields/dynamic-fields-renderer';

interface ShipmentDetail {
    id: string;
    status: string;
    carrier: string;
    trackingCode?: string;
    trackingUrl?: string;
}

interface OrderOverview {
    id: string;
    status: string;
    price?: string;
}

export default function OrderShipmentPanel({ conversationId }: { conversationId: string }) {
    const [order, setOrder] = useState<OrderOverview | null>(null);
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First find the order
            const orderRes = await fetch(`/api/cockpit/orders?conversationId=${conversationId}&limit=1`);
            if (orderRes.ok) {
                const json = await orderRes.json();
                if (json.data && json.data.length > 0) {
                    const foundOrder = json.data[0];
                    setOrder(foundOrder);
                    
                    // Then find shipment
                    const shipRes = await fetch(`/api/cockpit/orders/${foundOrder.id}/shipment`);
                    if (shipRes.ok) {
                        const shipJson = await shipRes.json();
                        setShipment(shipJson.data || null);
                    }
                } else {
                    setOrder(null);
                    setShipment(null);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            fetchData();
        }
    }, [conversationId]);

    if (loading && !order) {
        return <div className="p-4 text-xs text-center text-[hsl(var(--ui-text-muted))]">Carregando andamento...</div>;
    }

    if (!order) return null; // Only show if an order exists!

    return (
        <div className="flex flex-col border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
            <div className="p-4 flex justify-between items-center border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" /> Pedido Gerado
                </h3>
                <button onClick={fetchData} className="p-1 hover:bg-[hsl(var(--ui-bg-hover))] rounded-md" title="Atualizar">
                    <RefreshCw className={`w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))] ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">Status do Pedido:</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 rounded text-gray-800">{order.status}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">Valor Registrado:</span>
                    <span className="text-xs font-bold text-[hsl(var(--ui-success-ink))]">R$ {Number(order.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>

                {/* Shipment Details */}
                <div className="mt-2 pt-3 border-t border-[hsl(var(--ui-border))]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Truck className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                        <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">Logística e Entrega</span>
                    </div>

                    {!shipment ? (
                        <div className="text-xs text-[hsl(var(--ui-text-muted))] italic">Aguardando confirmação do Operador para iniciar o rastreio.</div>
                    ) : (
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">Transportadora</span>
                                <span className="text-xs font-medium">{shipment.carrier}</span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">Status</span>
                                <span className="text-xs font-semibold text-blue-700">{shipment.status}</span>
                            </div>

                            {shipment.trackingCode && shipment.trackingUrl && (
                                <a 
                                    href={shipment.trackingUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="mt-1 flex items-center justify-between p-2 rounded border border-[hsl(var(--ui-border))] bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">Código de Rastreio</span>
                                        <span className="text-xs font-bold font-mono text-[hsl(var(--ui-accent-blue))]">{shipment.trackingCode}</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {shipment && shipment.id && (
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--ui-border))]">
                        <DynamicFieldsRenderer entity="shipment" entityId={shipment.id} />
                    </div>
                )}

                <a href={`/cockpit/orders/${order.id}`} className="mt-2 text-center text-xs text-[hsl(var(--ui-accent-blue))] hover:underline font-medium">
                    Ver Order Detail
                </a>
            </div>
        </div>
    );
}
