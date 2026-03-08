'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Package, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface ShipmentRow {
    id: string;
    simulationId: string | null;
    trackingCode: string | null;
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendente', className: 'bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text-muted))] border border-[hsl(var(--ui-border))]' },
    posted: { label: 'Postado', className: 'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] border border-[hsl(var(--ui-accent-blue)/0.2)]' },
    in_transit: { label: 'Em Trânsito', className: 'bg-[hsl(var(--ui-warning)/0.1)] text-[hsl(var(--ui-warning))] border border-[hsl(var(--ui-warning)/0.2)]' },
    delivered: { label: 'Entregue', className: 'bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success))] border border-[hsl(var(--ui-success)/0.2)]' },
    exception: { label: 'Exceção', className: 'bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger))] border border-[hsl(var(--ui-danger)/0.2)]' },
    cancelled: { label: 'Cancelado', className: 'bg-[hsl(var(--ui-bg-muted))] text-[hsl(var(--ui-text-muted))] border border-[hsl(var(--ui-border))]' },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text-muted))]' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function DeltaCell({ delta }: { delta: number | null }) {
    if (delta === null) return <span className="text-[hsl(var(--ui-text-muted))]">—</span>;
    const abs = Math.abs(delta);
    if (delta > 0) return (
        <span className="flex items-center gap-1 font-semibold text-[hsl(var(--ui-danger))] tabular-nums">
            <TrendingUp className="w-3 h-3 shrink-0" />+R$ {abs.toFixed(2)}
        </span>
    );
    if (delta < 0) return (
        <span className="flex items-center gap-1 font-semibold text-[hsl(var(--ui-success))] tabular-nums">
            <TrendingDown className="w-3 h-3 shrink-0" />-R$ {abs.toFixed(2)}
        </span>
    );
    return (
        <span className="flex items-center gap-1 text-[hsl(var(--ui-text-muted))] tabular-nums">
            <Minus className="w-3 h-3 shrink-0" />R$ 0,00
        </span>
    );
}

export function EnviosClient() {
    const [rows, setRows] = useState<ShipmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const res = await safeFetch('/api/freight/shipments');
            const json = await res.json();
            if (json.ok) {
                setRows(json.data);
                setError(null);
            } else {
                setError('Falha ao carregar envios');
            }
        } catch {
            setError('Erro de conexão');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const formatBrl = (val: number | null) =>
        val !== null ? `R$ ${val.toFixed(2)}` : '—';

    return (
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Painel de Envios
                    </h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                        Histórico de envios com tracking, transportadora e variação financeira
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-xs font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Summary pills */}
            {!loading && !error && (
                <div className="flex flex-wrap gap-3">
                    {Object.entries(
                        rows.reduce<Record<string, number>>((acc, r) => {
                            acc[r.status] = (acc[r.status] ?? 0) + 1;
                            return acc;
                        }, {})
                    ).map(([status, count]) => {
                        const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text-muted))]' };
                        return (
                            <span key={status} className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
                                {cfg.label}: {count}
                            </span>
                        );
                    })}
                    {rows.length > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))]">
                            Total: {rows.length}
                        </span>
                    )}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center p-16">
                    <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                </div>
            ) : error ? (
                <div className="p-8 text-center text-sm text-[hsl(var(--ui-danger))]">{error}</div>
            ) : (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                {['Tracking', 'Transportadora', 'Serviço', 'Status', 'Cotado', 'Confirmado', 'Δ Delta', 'Data'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-[hsl(var(--ui-text-muted))] italic">
                                        Nenhum envio registrado ainda
                                    </td>
                                </tr>
                            ) : rows.map(row => (
                                <tr key={row.id} className="border-b border-[hsl(var(--ui-border)/0.3)] hover:bg-[hsl(var(--ui-bg)/0.5)] transition-colors">
                                    <td className="px-3 py-2.5 font-mono text-[hsl(var(--ui-text))] whitespace-nowrap">
                                        {row.trackingCode ?? <span className="text-[hsl(var(--ui-text-muted))] italic">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 font-medium text-[hsl(var(--ui-text))]">{row.carrier}</td>
                                    <td className="px-3 py-2.5 text-[hsl(var(--ui-text-muted))]">{row.service}</td>
                                    <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                                    <td className="px-3 py-2.5 tabular-nums text-[hsl(var(--ui-text))]">{formatBrl(row.quotedFreight ?? row.shipmentPrice)}</td>
                                    <td className="px-3 py-2.5 tabular-nums font-semibold text-[hsl(var(--ui-success))]">{formatBrl(row.confirmedFreight)}</td>
                                    <td className="px-3 py-2.5"><DeltaCell delta={row.deltaValue} /></td>
                                    <td className="px-3 py-2.5 tabular-nums text-[hsl(var(--ui-text-muted))] whitespace-nowrap">{formatDate(row.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
