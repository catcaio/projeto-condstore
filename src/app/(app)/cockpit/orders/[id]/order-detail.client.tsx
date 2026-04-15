'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Truck, User, Calendar } from 'lucide-react';
import { DynamicFieldsRenderer } from '@/ui/cockpit/custom-fields/dynamic-fields-renderer';
import { TimelineFeed } from '@/ui/timeline/timeline-feed';
import { OperationFeedback, type OperationFeedbackState } from '../../_components/operation-feedback';

interface OrderDetail {
    id: string;
    status: string;
    customerId?: string;
    conversationId?: string;
    quoteId?: string;
    carrier?: string;
    service?: string;
    price?: string;
    deliveryDeadline?: number;
    createdAt: string;
    updatedAt: string;
}

interface ShipmentDetail {
    id: string;
    status: string;
    carrier: string;
    service?: string;
    trackingCode?: string;
    trackingUrl?: string;
    estimatedDelivery?: number;
}

export default function OrderDetailClient({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingTracking, setSavingTracking] = useState(false);
    const [trackingInput, setTrackingInput] = useState('');
    const [trackingUrlInput, setTrackingUrlInput] = useState('');
    const [feedback, setFeedback] = useState<OperationFeedbackState | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/cockpit/orders/${orderId}`);
                if (res.ok) {
                    const json = await res.json();
                    setOrder(json.data);
                }

                const shipRes = await fetch(`/api/cockpit/orders/${orderId}/shipment`);
                if (shipRes.ok) {
                    const json = await shipRes.json();
                    if (json.data) {
                        setShipment(json.data);
                        setTrackingInput(json.data.trackingCode || '');
                        setTrackingUrlInput(json.data.trackingUrl || '');
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    if (loading) {
        return <div className="text-sm text-[hsl(var(--ui-text-muted))] flex h-full items-center justify-center">Carregando detalhes do pedido...</div>;
    }

    if (!order) {
        return <div className="text-sm text-[hsl(var(--ui-text-muted))] flex h-full items-center justify-center">Pedido não encontrado.</div>;
    }

    const handleSaveTracking = async () => {
        if (!shipment) return;
        setSavingTracking(true);
        try {
            const res = await fetch(`/api/cockpit/orders/${orderId}/shipment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackingCode: trackingInput,
                    trackingUrl: trackingUrlInput
                })
            });
            if (res.ok) {
                setFeedback({
                    tone: 'success',
                    title: 'Rastreio salvo com sucesso',
                });
                setShipment({ ...shipment, trackingCode: trackingInput, trackingUrl: trackingUrlInput });
            } else {
                setFeedback({
                    tone: res.status >= 500 ? 'error' : 'warning',
                    title: res.status >= 500 ? 'Erro de servidor ao salvar rastreio' : 'Ação inválida para salvar rastreio',
                });
            }
        } catch (e) {
            setFeedback({
                tone: 'error',
                title: 'Erro de rede ao salvar rastreio',
                description: 'Confira sua conexão e tente novamente.',
            });
        } finally {
            setSavingTracking(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <OperationFeedback feedback={feedback} />
            {/* Status & Basic Info */}
            <div className="bg-white p-6 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h3 className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase font-bold tracking-wider mb-1">Status do Pedido</h3>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {order.status}
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase font-bold tracking-wider mb-1">Criado Em</h3>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase font-bold tracking-wider mb-1">Valor do Frete</h3>
                    <div className="text-sm font-bold text-[hsl(var(--ui-success-ink))]">
                        R$ {Number(order.price || 0).toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>

            {/* Logistics Info */}
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-8 mb-4">
                <Truck className="w-5 h-5 text-[hsl(var(--ui-accent-blue))]" /> 
                Dados Logísticos
            </h2>
            <div className="bg-white p-6 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-2 font-medium">Transportadora</h3>
                    <p className="text-sm font-medium">{order.carrier || 'N/D'}</p>
                </div>
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-2 font-medium">Serviço/Modalidade</h3>
                    <p className="text-sm font-medium">{order.service || 'N/D'}</p>
                </div>
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-2 font-medium">Prazo Estimado (Dias)</h3>
                    <p className="text-sm font-medium">{order.deliveryDeadline || shipment?.estimatedDelivery || 'N/D'}</p>
                </div>
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-2 font-medium">Status do Envio</h3>
                    {shipment ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {shipment.status}
                        </span>
                    ) : (
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] italic">Aguardando confirmação do pedido</p>
                    )}
                </div>
                
                {shipment && (
                    <div className="md:col-span-2 pt-4 mt-2 border-t border-[hsl(var(--ui-border))] flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 block font-medium">Código de Rastreio</label>
                                <input 
                                    type="text" 
                                    value={trackingInput}
                                    onChange={(e) => setTrackingInput(e.target.value)}
                                    placeholder="Ex: BR123456789"
                                    className="w-full text-sm border border-[hsl(var(--ui-border))] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 block font-medium">URL de Rastreio (Opcional)</label>
                                <input 
                                    type="text" 
                                    value={trackingUrlInput}
                                    onChange={(e) => setTrackingUrlInput(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full text-sm border border-[hsl(var(--ui-border))] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={handleSaveTracking}
                                disabled={savingTracking}
                                className="text-xs bg-[hsl(var(--ui-accent-blue))] text-white px-4 py-1.5 rounded-md font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                {savingTracking ? 'Salvando...' : 'Salvar Rastreio'}
                            </button>
                        </div>
                        {shipment.trackingUrl && shipment.trackingCode && (
                            <div className="text-sm mt-2">
                                <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-[hsl(var(--ui-accent-blue))] hover:underline font-medium inline-flex items-center gap-1">
                                    Acessar link de rastreio ({shipment.trackingCode})
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CRM Link */}
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-8 mb-4">
                <User className="w-5 h-5 text-[hsl(var(--ui-accent-blue))]" /> 
                Origem (CRM)
            </h2>
            <div className="bg-white p-6 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex flex-col gap-4">
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">ID Cliente</h3>
                    <p className="text-sm font-mono text-gray-700">{order.customerId || 'Não atrelado'}</p>
                </div>
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">ID Conversa Base</h3>
                    {order.conversationId ? (
                         <a href={`/cockpit/atendimento`} className="text-sm font-mono text-[hsl(var(--ui-accent-blue))] hover:underline">
                            {order.conversationId}
                        </a>
                    ) : (
                        <p className="text-sm font-mono text-gray-700">Não atrelado</p>
                    )}
                </div>
                <div>
                    <h3 className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">ID Cotação de Origem</h3>
                    <p className="text-sm font-mono text-gray-700">{order.quoteId || 'N/A'}</p>
                </div>
            </div>

            {/* Campos Customizados (Dynamic Fields) */}
            <div className="mt-8">
                <DynamicFieldsRenderer entity="order" entityId={order.id} />
            </div>

            {/* Timeline */}
            <div className="mt-8">
                <TimelineFeed entityId={order.id} title="Timeline do Pedido" />
            </div>

        </div>
    );
}
