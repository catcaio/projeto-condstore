'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Package, RefreshCw, Truck } from 'lucide-react';
import { DynamicFieldsRenderer } from '@/ui/cockpit/custom-fields/dynamic-fields-renderer';
import {
    buildActionErrorFromResponse,
    buildActionSuccess,
    buildUnexpectedActionError,
    InlineActionFeedback,
    type ActionFeedbackState,
} from './inline-action-feedback';

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
    refreshToken?: number;
    onFlowUpdated?: () => Promise<void> | void;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Rascunho operacional',
    CONFIRMED: 'Confirmado',
    PROCESSING: 'Em separação',
    SHIPPED: 'Em transporte',
    DELIVERED: 'Entregue',
    CANCELED: 'Cancelado',
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
    CREATED: 'Criado',
    SCHEDULED: 'Agendado',
    PICKED_UP: 'Coletado',
    IN_TRANSIT: 'Em trânsito',
    OUT_FOR_DELIVERY: 'Saiu para entrega',
    DELIVERED: 'Entregue',
    FAILED: 'Falha operacional',
};

function formatCurrency(value?: string) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function shortCode(id: string) {
    return id.split('-')[0];
}

function getNextStep(order: OrderOverview | null, shipment: ShipmentDetail | null) {
    if (!order) {
        return {
            title: 'Pedido ainda não criado',
            description: 'Depois da aprovação do cliente, gere o pedido em DRAFT a partir da cotação enviada.',
        };
    }

    if (order.status === 'DRAFT') {
        return {
            title: 'Confirmar pedido',
            description: 'A confirmação do pedido libera o shipment e inicia a execução logística real.',
        };
    }

    if (!shipment) {
        return {
            title: 'Aguardando shipment',
            description: 'O shipment nasce a partir da confirmação. Atualize o painel se ele ainda não apareceu.',
        };
    }

    if (shipment.status === 'DELIVERED') {
        return {
            title: 'Shipment concluído',
            description: 'Pedido e entrega fechados no fluxo supervisionado do MVP.',
        };
    }

    return {
        title: 'Acompanhar shipment',
        description: `Shipment em ${SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status.toLowerCase()}.`,
    };
}

export default function OrderShipmentPanel({
    conversationId,
    refreshToken = 0,
    onFlowUpdated,
}: OrderShipmentPanelProps) {
    const [order, setOrder] = useState<OrderOverview | null>(null);
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [loadFeedback, setLoadFeedback] = useState<ActionFeedbackState | null>(null);
    const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState | null>(null);

    const fetchData = async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }
        setLoadFeedback(null);

        try {
            const orderRes = await fetch(`/api/cockpit/orders?conversationId=${conversationId}&limit=1`);
            if (!orderRes.ok) {
                setOrder(null);
                setShipment(null);
                setLoadFeedback(await buildActionErrorFromResponse(
                    orderRes,
                    'Falha ao carregar pedido',
                    'Não foi possível consultar o pedido vinculado a esta conversa.'
                ));
                return;
            }

            const orderJson = await orderRes.json();
            if (!orderJson.data || orderJson.data.length === 0) {
                setOrder(null);
                setShipment(null);
                return;
            }

            const foundOrder = orderJson.data[0] as OrderOverview;
            setOrder(foundOrder);

            const shipRes = await fetch(`/api/cockpit/orders/${foundOrder.id}/shipment`);
            if (!shipRes.ok) {
                setShipment(null);
                setLoadFeedback(await buildActionErrorFromResponse(
                    shipRes,
                    'Falha ao carregar shipment',
                    'Não foi possível consultar o shipment deste pedido.'
                ));
                return;
            }

            const shipJson = await shipRes.json();
            setShipment(shipJson.data || null);
        } catch (error) {
            console.error(error);
            setOrder(null);
            setShipment(null);
            setLoadFeedback(buildUnexpectedActionError(
                'Falha ao carregar painel',
                'Não foi possível consultar pedido e shipment desta conversa.'
            ));
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (conversationId) {
            void fetchData();
        }
    }, [conversationId, refreshToken]);

    const handleConfirmOrder = async () => {
        if (!order || order.status !== 'DRAFT') return;

        setConfirming(true);
        setActionFeedback(null);

        try {
            const res = await fetch(`/api/cockpit/orders/${order.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CONFIRMED' }),
            });

            if (res.ok) {
                setActionFeedback(buildActionSuccess(
                    'Pedido confirmado',
                    'Pedido confirmado e shipment liberado para a operação logística.'
                ));
                await fetchData(false);
                await Promise.resolve(onFlowUpdated?.());
            } else {
                setActionFeedback(await buildActionErrorFromResponse(
                    res,
                    'Falha ao confirmar pedido',
                    'Não foi possível confirmar o pedido neste momento.'
                ));
            }
        } catch (error) {
            console.error(error);
            setActionFeedback(buildUnexpectedActionError(
                'Falha ao confirmar pedido',
                'Não foi possível concluir a requisição de confirmação.'
            ));
        } finally {
            setConfirming(false);
        }
    };

    const nextStep = loadFeedback && !order
        ? {
            title: 'Revalidar pedido',
            description: 'O painel não conseguiu confirmar se já existe um pedido para esta conversa.',
        }
        : loadFeedback && order && !shipment
            ? {
                title: 'Revalidar shipment',
                description: 'O painel não conseguiu consultar o shipment deste pedido. Atualize para sincronizar o estado real.',
            }
            : getNextStep(order, shipment);

    return (
        <div className="flex flex-col border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
            <div className="p-4 flex justify-between items-center border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" /> Pedido e Shipment
                </h3>
                <button onClick={() => void fetchData()} className="p-1 hover:bg-[hsl(var(--ui-bg-hover))] rounded-md" title="Atualizar">
                    <RefreshCw className={`w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))] ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
                <div className="rounded-lg border border-[hsl(var(--ui-accent-blue)/0.18)] bg-[hsl(var(--ui-accent-blue)/0.08)] px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ui-accent-blue-ink))]">
                        Próximo passo operacional
                    </p>
                    <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{nextStep.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[hsl(var(--ui-text-muted))]">{nextStep.description}</p>
                </div>

                <InlineActionFeedback feedback={loadFeedback} />
                <InlineActionFeedback feedback={actionFeedback} />

                {loading && !order ? (
                    <div className="text-xs text-center text-[hsl(var(--ui-text-muted))] py-4">Carregando andamento operacional...</div>
                ) : !order ? (
                    <div className="rounded-lg border border-dashed border-[hsl(var(--ui-border-strong))] bg-white px-4 py-4">
                        <p className="text-sm font-medium text-[hsl(var(--ui-text))]">Nenhum pedido vinculado a esta conversa.</p>
                        <p className="mt-1 text-sm leading-5 text-[hsl(var(--ui-text-muted))]">
                            Quando o cliente aprovar a cotação enviada, gere o pedido em DRAFT neste mesmo fluxo.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-lg border border-[hsl(var(--ui-border))] bg-white px-3 py-3">
                            <div className="flex justify-between items-center gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-muted))]">
                                        Pedido
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-[hsl(var(--ui-text))]">
                                        #{shortCode(order.id)}
                                    </p>
                                </div>
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700">
                                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                </span>
                            </div>

                            <div className="mt-3 flex justify-between items-center">
                                <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">Valor registrado</span>
                                <span className="text-sm font-bold text-[hsl(var(--ui-success-ink))]">{formatCurrency(order.price)}</span>
                            </div>

                            {order.status === 'DRAFT' ? (
                                <button
                                    onClick={handleConfirmOrder}
                                    disabled={confirming}
                                    className="mt-4 w-full rounded-md bg-[hsl(var(--ui-accent-blue))] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--ui-accent-blue-hover))] disabled:opacity-50"
                                >
                                    {confirming ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Confirmando pedido...
                                        </span>
                                    ) : (
                                        'Confirmar pedido e liberar shipment'
                                    )}
                                </button>
                            ) : (
                                <p className="mt-4 text-xs leading-5 text-[hsl(var(--ui-text-muted))]">
                                    Pedido já confirmado no fluxo operacional. O próximo passo agora é acompanhar a execução do shipment.
                                </p>
                            )}

                            <a href={`/cockpit/orders/${order.id}`} className="mt-4 inline-flex text-xs text-[hsl(var(--ui-accent-blue))] hover:underline font-medium">
                                Ver detalhes do pedido
                            </a>
                        </div>

                        <div className="rounded-lg border border-[hsl(var(--ui-border))] bg-white px-3 py-3">
                            <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-muted))]">
                                    Shipment
                                </span>
                            </div>

                            {!shipment ? (
                                <p className="mt-3 text-sm leading-5 text-[hsl(var(--ui-text-muted))]">
                                    {order.status === 'DRAFT'
                                        ? 'O shipment será criado automaticamente depois da confirmação do pedido.'
                                        : 'Shipment ainda não encontrado. Atualize o painel para sincronizar o contexto real da operação.'}
                                </p>
                            ) : (
                                <div className="mt-3 flex flex-col gap-3">
                                    <div className="flex justify-between items-center gap-3">
                                        <div>
                                            <p className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase">Transportadora</p>
                                            <p className="text-sm font-medium text-[hsl(var(--ui-text))]">{shipment.carrier}</p>
                                        </div>
                                        <span className="rounded-full bg-[hsl(var(--ui-accent-blue)/0.08)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ui-accent-blue-ink))]">
                                            {SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status}
                                        </span>
                                    </div>

                                    {shipment.trackingCode && shipment.trackingUrl ? (
                                        <a
                                            href={shipment.trackingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-3 py-2 hover:bg-white transition-colors"
                                        >
                                            <div>
                                                <p className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase">Código de rastreio</p>
                                                <p className="mt-1 font-mono text-sm font-semibold text-[hsl(var(--ui-accent-blue))]">
                                                    {shipment.trackingCode}
                                                </p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                                        </a>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {shipment?.id ? (
                            <div className="mt-1 pt-1 border-t border-[hsl(var(--ui-border))]">
                                <DynamicFieldsRenderer entity="shipment" entityId={shipment.id} />
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
