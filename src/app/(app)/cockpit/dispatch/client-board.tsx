'use client';

import { useState } from 'react';
import { Badge } from '@/ui/components';
import { Package, Route, Copy, RefreshCw, Layers } from 'lucide-react';

interface OrderItem {
    id: string;
    ref: string;
    status: string;
    name: string;
    city: string | null;
}

interface dispatchColumns {
    pending: OrderItem[];
    routed: OrderItem[];
    in_transit: OrderItem[];
    delivered: OrderItem[];
    failed: OrderItem[];
}

export default function DispatchBoardClient({ initialData, routes }: { initialData: dispatchColumns, routes: any[] }) {
    const [data, setData] = useState(initialData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleImportOrders = async () => {
        setIsImporting(true);
        try {
            const res = await fetch('/api/dispatch/import-orders', { method: 'POST' });
            if (!res.ok) throw new Error('Falha ao importar');
            const result = await res.json();

            alert(`Importados ${result.imported} pedidos`);
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            alert('Erro na importação MVP');
        } finally {
            setIsImporting(false);
        }
    };

    const handleGenerateRoutes = async () => {
        setIsGenerating(true);
        try {
            const targetDate = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/dispatch/generate-routes?date=${targetDate}`, { method: 'POST' });
            if (!res.ok) throw new Error('Falha na roteirização');
            const result = await res.json();

            alert(`Gerado ${result.routesGenerated.length} rotas do dia.`);
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            alert('Erro no despacho');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyRouteLink = () => {
        const link = `${window.location.origin}/tech`;
        navigator.clipboard.writeText(link);
        alert('Link enviado ao clipboard. O técnico deve acessar com o device.');
    };

    const renderColumn = (title: string, items: OrderItem[], color: string) => (
        <div className="flex flex-col bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] h-[600px] overflow-hidden w-[300px] shrink-0">
            <div className={`p-4 border-b border-[hsl(var(--ui-border))] flex items-center justify-between bg-gray-50/50`}>
                <h3 className={`font-semibold text-sm flex items-center gap-2 ${color}`}><Layers className="w-4 h-4" /> {title}</h3>
                <Badge>{items.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20">
                {items.length === 0 ? <p className="text-xs text-center text-[hsl(var(--ui-text-muted))] mt-10 italic">Nenhum evento</p> : items.map(o => (
                    <div key={o.id} className="p-3 bg-white rounded shadow-sm border border-gray-100 flex flex-col gap-2 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-xs py-1 px-2 bg-gray-100 rounded text-gray-700">{o.ref}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{o.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Route className="w-3 h-3" /> {o.city}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-[hsl(var(--ui-border))]">
                <div className="flex gap-4 items-center">
                    <button
                        onClick={handleImportOrders}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))] rounded shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Importar Pendentes do ERP (Mock)
                    </button>

                    <button
                        onClick={handleGenerateRoutes}
                        disabled={isGenerating || data.pending.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--ui-primary))] text-white rounded shadow-sm hover:opacity-90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />} Reterizar Dia (Auto)
                    </button>

                    <button
                        onClick={copyRouteLink}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded shadow-sm hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                        <Copy className="w-4 h-4" /> Copiar Link Motorista (/tech)
                    </button>
                </div>

                <div className="text-sm text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                    {routes.length} rotas mapeadas.
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                {renderColumn('A ROTEIRIZAR', data.pending, 'text-gray-600')}
                {renderColumn('ROTEIRIZADOS', data.routed, 'text-blue-600')}
                {renderColumn('EM ROTA', data.in_transit, 'text-amber-600')}
                {renderColumn('ENTREGUES', data.delivered, 'text-green-600')}
                {renderColumn('FALHAS (RETORNO)', data.failed, 'text-red-500')}
            </div>
        </div>
    );
}
