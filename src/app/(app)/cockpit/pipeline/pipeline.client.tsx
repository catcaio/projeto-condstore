'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Phone, Clock, MoveRight, HelpCircle, TrendingUp, Users, DollarSign, PackageX, CheckCircle } from 'lucide-react';
import { Badge } from '@/ui/components';

interface ConversationCard {
    id: string;
    phoneHash?: string;
    phone?: string;
    status: string;
    stage: 'NEW' | 'QUALIFYING' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST';
    lastMessageAt: string;
}

const COLUMNS = [
    { id: 'NEW', title: 'Novos', color: 'border-l-4 border-gray-400' },
    { id: 'QUALIFYING', title: 'Qualificando', color: 'border-l-4 border-blue-400' },
    { id: 'QUOTED', title: 'Cotados', color: 'border-l-4 border-yellow-400' },
    { id: 'NEGOTIATING', title: 'Negociando', color: 'border-l-4 border-orange-400' },
    { id: 'WON', title: 'Ganhos', color: 'border-l-4 border-green-500' },
    { id: 'LOST', title: 'Perdidos', color: 'border-l-4 border-red-500' }
];

interface PipelineMetrics {
    totalLeads: number;
    conversionRate: number;
    avgQuoteValue: number;
    totalQuotesSent: number;
    opportunitiesLost: number;
    dealsWon: number;
}

export default function PipelineClient() {
    const [conversations, setConversations] = useState<ConversationCard[]>([]);
    const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [draggedItem, setDraggedItem] = useState<ConversationCard | null>(null);

    const fetchPipelineData = async () => {
        setLoading(true);
        try {
            const [resConv, resMet] = await Promise.all([
                fetch('/api/cockpit/pipeline?limit=200'),
                fetch('/api/cockpit/pipeline/metrics')
            ]);
            
            if (resConv.ok) {
                const json = await resConv.json();
                setConversations(json.data || []);
            }
            if (resMet.ok) {
                const json = await resMet.json();
                setMetrics(json.data);
            }
        } catch (e) {
            console.error('Falha ao buscar pipeline data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPipelineData();
    }, []);

    const updateStage = async (conversationId: string, newStage: string) => {
        // Optimistic UI Update
        setConversations(prev => 
            prev.map(c => c.id === conversationId ? { ...c, stage: newStage as any } : c)
        );

        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/stage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });

            if (!res.ok) {
                alert('Erro ao mover a conversa no servidor.');
                fetchPipelineData(); // Revert on failure
            }
            fetchPipelineData(); // Re-fetch to update metrics
        } catch (e) {
            alert('Falha na requisição.');
            fetchPipelineData();
        }
    };

    const handleDragStart = (e: React.DragEvent, item: ConversationCard) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag requires setting data
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedItem && draggedItem.stage !== columnId) {
            updateStage(draggedItem.id, columnId);
        }
        setDraggedItem(null);
    };

    if (loading && !metrics) {
        return <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--ui-text-muted))]">Carregando pipeline...</div>;
    }

    return (
        <div className="flex h-full flex-col gap-6">
            {/* KPI Dashboard */}
            {metrics && (
                <div className="grid grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">Total de Leads</p>
                            <h4 className="text-2xl font-bold text-gray-800">{metrics.totalLeads}</h4>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Users size={20} />
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">Taxa de Conversão</p>
                            <h4 className="text-2xl font-bold text-gray-800">{metrics.conversionRate}%</h4>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">Ticket Médio (Frete)</p>
                            <h4 className="text-2xl font-bold text-gray-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgQuoteValue)}
                            </h4>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">Ganhos</p>
                            <h4 className="text-2xl font-bold text-gray-800">{metrics.dealsWon}</h4>
                        </div>
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-1 font-medium">Perdidos</p>
                            <h4 className="text-2xl font-bold text-gray-800">{metrics.opportunitiesLost}</h4>
                        </div>
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                            <PackageX size={20} />
                        </div>
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map(col => {
                    const columnItems = conversations.filter(c => (c.stage || 'NEW') === col.id);
                    
                    return (
                        <div 
                            key={col.id} 
                            className="flex flex-col flex-shrink-0 w-[22rem] bg-[hsl(var(--ui-bg))] rounded-lg border border-[hsl(var(--ui-border))] shadow-sm"
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
                                    <div className="flex items-center gap-1.5 font-medium text-sm mb-2">
                                        <Phone className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                        {item.phone || item.phoneHash?.slice(0, 10)}...
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[hsl(var(--ui-text-muted))]">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(item.lastMessageAt), 'dd/MM HH:mm')}
                                        </span>
                                        <a href={`/cockpit/atendimento`} className="text-[hsl(var(--ui-accent-blue))] hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            Abrir <MoveRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {columnItems.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs text-center p-4">
                                    <HelpCircle className="w-6 h-6 mb-2" />
                                    Arraste itens para cá
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
