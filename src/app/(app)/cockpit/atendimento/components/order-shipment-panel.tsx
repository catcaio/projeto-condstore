'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Package, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { DynamicFieldsRenderer } from '@/ui/cockpit/custom-fields/dynamic-fields-renderer';
import { Badge } from '@/ui/components';

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

interface OrderShipmentPanelProps {
    conversationId: string;
    refreshKey?: number;
    onFlowChanged?: () => void | Promise<void>;
}

interface PanelNotice {
    tone: 'success' | 'error';
    title: string;
    message: string;
    requestId?: string;
}

function getOrderStatusMeta(status: string) {
    switch (status) {
        case 'CONFIRMED':
            return { label: 'Confirmado', variant: 'success' as const };
        case 'PROCESSING':
            return { label: 'Em separacao', variant: 'default' as const };
        case 'SHIPPED':
            return { label: 'Em transporte', variant: 'default' as const };
        case 'DELIVERED':
            return { label: 'Entregue', variant: 'success' as const };
        case 'CANCELED':
            return { label: 'Cancelado', variant: 'danger' as const };
        default:
            return { label: 'Rascunho', variant: 'outline' as const };
    }
}

async function readApiError(response: Response, fallbackMessage: string) {
    try {
        const payload = await response.json();
        return {
            message: payload?.error?.message || fallbackMessage,
            requestId: payload?.error?.requestId as string | undefined,
        };
    } catch {
        return { message: fallbackMessage };
    }
}

export default function OrderShipmentPanel({ conversationId, refreshKey = 0, onFlowChanged }: OrderShipmentPanelProps) {
    const [order, setOrder] = useState<OrderOverview | null>(null);
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [notice, setNotice] = useState<PanelNotice | null>(null);

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
                        setNotice(null);
                    } else {
                        const error = await readApiError(shipRes, 'Nao foi possivel carregar o shipment deste pedido.');
                        setShipment(null);
                        setNotice({
                            tone: 'error',
                            title: 'Falha ao carregar shipment',
                            message: error.message,
                            requestId: error.requestId,
                        });
                    }
                } else {
                    setOrder(null);
                    setShipment(null);
                    setNotice(null);
                }
            } else {
                const error = await readApiError(orderRes, 'Nao foi possivel carregar o pedido desta conversa.');
                setOrder(null);
                setShipment(null);
                setNotice({
                    tone: 'error',
                    title: 'Falha ao carregar pedido',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch (err) {
            console.error(err);
            setNotice({
                tone: 'error',
                title: 'Falha ao carregar andamento',
                message: 'Nao foi possivel atualizar pedido e logistica agora.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            void fetchData();
        }
    }, [conversationId, refreshKey]);

    const handleConfirmOrder = async () => {
        if (!order || confirming) return;

        setConfirming(true);
        setNotice(null);

        try {
            const res = await fetch(`/api/cockpit/orders/${order.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CONFIRMED' })
            });

            if (res.ok) {
                await fetchData();
                await Promise.resolve(onFlowChanged?.());
                setNotice({
                    tone: 'success',
                    title: 'Pedido confirmado',
                    message: 'A confirmacao foi registrada e o shipment foi aberto para a logistica.',
                });
            } else {
                const error = await readApiError(res, 'Nao foi possivel confirmar o pedido.');
                setNotice({
                    tone: 'error',
                    title: 'Confirmacao nao concluida',
                    message: error.message,
                    requestId: error.requestId,
                });
            }
        } catch {
            setNotice({
                tone: 'error',
                title: 'Falha na requisicao',
                message: 'Nao foi possivel confirmar o pedido agora.',
            });
        } finally {
            setConfirming(false);
        }
    };

    if (loading && !order) {
        return <div className="p-4 text-xs text-center text-[hsl(var(--ui-text-muted))]">Carregando andamento...</div>;
    }

    if (!order) return null; // Only show if an order exists!

    const orderStatus = getOrderStatusMeta(order.status);

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
                    <Badge variant={orderStatus.variant}>{orderStatus.label}</Badge>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">Valor Registrado:</span>
                    <span className="text-xs font-bold text-[hsl(var(--ui-success-ink))]">R$ {Number(order.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>

                {notice && (
                    <div
                        className={`rounded-md border p-3 ${
                            notice.tone === 'success'
                                ? 'border-[hsl(var(--ui-success)/0.3)] bg-[hsl(var(--ui-success)/0.08)] text-[hsl(var(--ui-success-ink))]'
                                : 'border-[hsl(var(--ui-danger)/0.3)] bg-[hsl(var(--ui-danger)/0.08)] text-[hsl(var(--ui-danger-ink))]'
                        }`}
                    >
                        <div className="flex items-start gap-2">
                            {notice.tone === 'success' ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            )}
                            <div className="min-w-0">
                                <div className="text-xs font-semibold">{notice.title}</div>
                                <div className="mt-1 text-xs leading-relaxed">{notice.message}</div>
                                {notice.requestId && (
                                    <div className="mt-1 text-[10px] opacity-80">Req. {notice.requestId}</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {order.status === 'DRAFT' && (
                    <div className="rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-3 py-2 text-xs text-[hsl(var(--ui-text-muted))]">
                        <div className="font-medium text-[hsl(var(--ui-text))]">Pedido criado com sucesso.</div>
                        <div className="mt-1 leading-relaxed">
                            O proximo passo operacional e confirmar o pedido para abrir a logistica sem sair desta conversa.
                        </div>
                        <button
                            onClick={handleConfirmOrder}
                            disabled={confirming}
                            className="mt-3 inline-flex items-center gap-2 rounded-md bg-[hsl(var(--ui-accent-blue))] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                        >
                            {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            Confirmar pedido e abrir shipment
                        </button>
                    </div>
                )}

                {/* Shipment Details */}
                <div className="mt-2 pt-3 border-t border-[hsl(var(--ui-border))]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Truck className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                        <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">Logística e Entrega</span>
                    </div>

                    {!shipment ? (
                        <div className="text-xs text-[hsl(var(--ui-text-muted))] italic">
                            {order.status === 'DRAFT'
                                ? 'Shipment ainda nao foi aberto porque o pedido segue em rascunho.'
                                : 'Shipment ainda nao vinculado a este pedido.'}
                        </div>
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
                    Abrir pedido
                </a>
            </div>
        </div>
    );
}
