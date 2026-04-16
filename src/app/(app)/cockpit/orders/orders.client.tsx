'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Package, Truck, MoveRight, HelpCircle, Clock } from 'lucide-react';
import { Badge } from '@/ui/components';
import { OperationFeedback, type OperationFeedbackState } from '../_components/operation-feedback';

interface OrderCard {
    id: string;
    status: 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
    carrier?: string;
    service?: string;
    price?: string;
    createdAt: string;
}

const COLUMNS = [
    { id: 'DRAFT', title: 'Rascunho', color: 'border-l-4 border-gray-400' },
    { id: 'CONFIRMED', title: 'Confirmados', color: 'border-l-4 border-blue-400' },
    { id: 'PROCESSING', title: 'Em Processamento', color: 'border-l-4 border-purple-400' },
    { id: 'SHIPPED', title: 'Enviados / Em Trânsito', color: 'border-l-4 border-orange-400' },
    { id: 'DELIVERED', title: 'Entregues', color: 'border-l-4 border-green-500' },
    { id: 'CANCELED', title: 'Cancelados', color: 'border-l-4 border-red-500' },
];

export default function OrdersClient() {
    const [orders, setOrders] = useState<OrderCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [draggedItem, setDraggedItem] = useState<OrderCard | null>(null);
    const [feedback, setFeedback] = useState<OperationFeedbackState | null>(null);
    const pageSize = 50;

    const fetchOrdersPage = async (nextOffset = 0, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await fetch(`/api/cockpit/orders?limit=${pageSize}&offset=${nextOffset}`);
            if (!res.ok) {
                const tone = res.status >= 500 ? 'error' : 'warning';
                setFeedback({
                    tone,
                    title: res.status >= 500 ? 'Erro de servidor ao carregar pedidos' : 'Ação inválida ao carregar pedidos',
                    description: 'Tente novamente. Se persistir, acione o suporte operacional.',
                });
                return;
            }

            const json = await res.json();
            const incoming = (json.data || []) as OrderCard[];
            setOrders((prev) => (append ? [...prev, ...incoming] : incoming));
            setOffset(nextOffset + incoming.length);
            setHasMore(incoming.length === pageSize);
        } catch (e) {
            setFeedback({
                tone: 'error',
                title: 'Erro de rede ao carregar pedidos',
                description: 'Verifique sua conexão e tente novamente.',
            });
        } finally {
            if (append) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchOrdersPage(0, false);
    }, []);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        fetchOrdersPage(offset, true);
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        // Optimistic UI Update
        setOrders(prev => 
            prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o)
        );

        try {
            const res = await fetch(`/api/cockpit/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                setFeedback({
                    tone: res.status >= 500 ? 'error' : 'warning',
                    title: res.status >= 500 ? 'Erro de servidor ao mover pedido' : 'Ação inválida para este pedido',
                    description: 'Os dados foram recarregados para manter consistência.',
                });
                fetchOrdersPage(0, false); // Revert on failure
                return;
            }
            setFeedback({
                tone: 'success',
                title: 'Status do pedido atualizado',
            });
        } catch (e) {
            setFeedback({
                tone: 'error',
                title: 'Erro de rede ao atualizar pedido',
                description: 'A operação não foi concluída. Tentando recarregar os dados.',
            });
            fetchOrdersPage(0, false);
        }
    };

    const handleDragStart = (e: React.DragEvent, item: OrderCard) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedItem && draggedItem.status !== columnId) {
            updateStatus(draggedItem.id, columnId);
        }
        setDraggedItem(null);
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando pedidos...</div>;
    }

    return (
        <div className="flex h-full flex-col gap-4">
            <OperationFeedback feedback={feedback} />
            <div className="text-xs text-[hsl(var(--ui-text-muted))]">
                Exibindo os pedidos mais recentes em lotes de {pageSize}.
            </div>
            <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
            {COLUMNS.map(col => {
                const columnItems = orders.filter(o => (o.status || 'DRAFT') === col.id);
                
                return (
                    <div 
                        key={col.id} 
                        className="flex flex-col flex-shrink-0 w-72 bg-[hsl(var(--ui-bg))] rounded-lg border border-[hsl(var(--ui-border))] shadow-sm"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header */}
                        <div className={`p-3 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] rounded-t-lg ${col.color}`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-sm">{col.title}</h3>
                                <Badge variant="outline" className="text-xs bg-white">{columnItems.length}</Badge>
                            </div>
                        </div>

                        {/* Column Body - Drop Zone */}
                        <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px]">
                            {columnItems.map(item => (
                                <div 
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    className="p-3 bg-white border border-[hsl(var(--ui-border))] rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:border-[hsl(var(--ui-accent-blue))]"
                                >
                                    <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                                            <Package className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                            #{item.id.slice(0, 5).toUpperCase()}
                                        </div>
                                        {item.price && (
                                            <div className="text-xs font-bold text-[hsl(var(--ui-success-ink))]">
                                                R$ {Number(item.price).toFixed(2).replace('.', ',')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-700 flex items-center gap-1.5 mb-2">
                                        <Truck className="w-3.5 h-3.5" />
                                        {item.carrier || 'N/D'} - {item.service || 'N/D'}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-[hsl(var(--ui-text-muted))]">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(item.createdAt), 'dd/MM HH:mm')}
                                        </span>
                                        <a href={`/cockpit/orders/${item.id}`} className="text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1 font-medium" onClick={(e) => e.stopPropagation()}>
                                            Detalhes <MoveRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {columnItems.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs text-center p-4">
                                    <HelpCircle className="w-6 h-6 mb-2" />
                                    Arraste pedidos para cá
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            </div>
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={loadMore}
                    disabled={!hasMore || loadingMore}
                    className="rounded-md border border-[hsl(var(--ui-border))] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loadingMore ? 'Carregando mais pedidos...' : hasMore ? 'Carregar mais pedidos' : 'Todos os pedidos carregados'}
                </button>
            </div>
        </div>
    );
}
