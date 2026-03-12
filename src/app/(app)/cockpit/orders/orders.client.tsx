'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Package, Truck, MoveRight, HelpCircle, Clock } from 'lucide-react';
import { Badge } from '@/ui/components';

interface OrderCard {
    id: string;
    status: 'CREATED' | 'CONFIRMED' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
    carrier?: string;
    service?: string;
    price?: string;
    createdAt: string;
}

const COLUMNS = [
    { id: 'CREATED', title: 'Criados', color: 'border-l-4 border-gray-400' },
    { id: 'CONFIRMED', title: 'Confirmados', color: 'border-l-4 border-blue-400' },
    { id: 'SCHEDULED', title: 'Agendados', color: 'border-l-4 border-purple-400' },
    { id: 'IN_TRANSIT', title: 'Em Trânsito', color: 'border-l-4 border-orange-400' },
    { id: 'DELIVERED', title: 'Entregues', color: 'border-l-4 border-green-500' },
];

export default function OrdersClient() {
    const [orders, setOrders] = useState<OrderCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedItem, setDraggedItem] = useState<OrderCard | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cockpit/orders?limit=200');
            if (res.ok) {
                const json = await res.json();
                setOrders(json.data || []);
            }
        } catch (e) {
            console.error('Falha ao buscar pedidos', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

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
                alert('Erro ao mover a ordem no servidor.');
                fetchOrders(); // Revert on failure
            }
        } catch (e) {
            alert('Falha na requisição.');
            fetchOrders();
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
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {COLUMNS.map(col => {
                const columnItems = orders.filter(o => (o.status || 'CREATED') === col.id);
                
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
    );
}
