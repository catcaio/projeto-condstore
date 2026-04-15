'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Truck, Package, Search, Calendar, MapPin, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Shipment {
    id: string;
    simulationId: string;
    trackingCode: string;
    carrier: string;
    service: string;
    status: string;
    shipmentPrice: number | null;
    quotedFreight: number | null;
    confirmedFreight: number | null;
    deltaValue: number | null;
    createdAt: string;
    updatedAt: string;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    'pending': { label: 'Pendente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
    'CREATED': { label: 'Criada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
    'IN_TRANSIT': { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    'DELIVERED': { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
    'FAILED': { label: 'Falha', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

export function DeliveriesClient() {
    const searchParams = useSearchParams();
    const orderIdParam = searchParams.get('orderId');
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        safeFetch('/api/freight/shipments')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data.ok) {
                    setShipments(data.data);
                }
            })
            .catch(err => console.error('Failed to fetch shipments', err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        
        return () => { isMounted = false; };
    }, []);

    const filteredShipments = shipments.filter(s => {
        const matchesQuery = s.trackingCode?.toLowerCase().includes(filter.toLowerCase()) || 
                             s.carrier?.toLowerCase().includes(filter.toLowerCase());
        const matchesOrder = orderIdParam ? s.id.includes(orderIdParam) || s.trackingCode?.includes(orderIdParam) : true;
        return matchesQuery && matchesOrder;
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                    <input 
                        type="text" 
                        placeholder="Buscar por código de rastreio ou transportadora..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] transition-all"
                    />
                </div>
                {orderIdParam && (
                    <div className="text-sm border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Filtrando por pedido: <span className="font-mono font-bold">{orderIdParam.split('-')[0]}</span>
                        <button onClick={() => window.history.replaceState({}, '', '/cockpit/deliveries')} className="ml-2 hover:underline">Limpar</button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-[hsl(var(--ui-text-muted))]">
                    <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--ui-accent-blue)/0.3)] border-t-[hsl(var(--ui-accent-blue))] animate-spin mb-4" />
                    <p>Carregando fluxos logísticos...</p>
                </div>
            ) : filteredShipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[hsl(var(--ui-border))] rounded-2xl bg-[hsl(var(--ui-surface)/0.5)]">
                    <Truck className="w-12 h-12 text-[hsl(var(--ui-text-muted)/0.3)] mb-4" />
                    <h3 className="text-lg font-semibold text-[hsl(var(--ui-text))]">Nenhuma entrega encontrada</h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1">Experimente remover filtros ou buscar por outro termo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredShipments.map(s => {
                        const status = statusMap[s.status] || statusMap['pending'];
                        const StatusIcon = status.icon;
                        
                        return (
                            <div key={s.id} className="group rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 hover:border-[hsl(var(--ui-accent-blue)/0.5)] transition-all hover:shadow-lg hover:shadow-[hsl(var(--ui-accent-blue)/0.05)]">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${status.color}`}>
                                            <StatusIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[hsl(var(--ui-text))] flex items-center gap-2">
                                                {s.carrier}
                                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] font-medium">
                                                    {s.service}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">
                                                Cód: <span className="font-mono text-[hsl(var(--ui-text))]">{s.trackingCode || 'AGUARDANDO'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${status.color}`}>
                                        {status.label}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 border-t border-[hsl(var(--ui-border)/0.5)] pt-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Criação</label>
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                            {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Última Atualização</label>
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                            {new Date(s.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Custo Etiqueta</label>
                                        <div className="text-sm font-bold text-[hsl(var(--ui-text))]">
                                            {s.shipmentPrice ? `R$ ${s.shipmentPrice.toFixed(2).replace('.', ',')}` : '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex gap-2">
                                    <button 
                                        onClick={() => window.open(`https://www.melhorenvio.com.br/rastreio/${s.trackingCode}`, '_blank')}
                                        disabled={!s.trackingCode}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-[hsl(var(--ui-page))] border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-bg))] transition-colors disabled:opacity-50"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Tracking Externo
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
