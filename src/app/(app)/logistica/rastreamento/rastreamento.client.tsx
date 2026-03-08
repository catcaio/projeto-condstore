'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Navigation, CheckCircle2, Circle, Clock } from 'lucide-react';

interface ShipmentRow {
    id: string;
    trackingCode: string | null;
    carrier: string;
    service: string;
    status: string;
    shipmentPrice: number | null;
    createdAt: string;
}

// Ordered pipeline of statuses
const STATUS_PIPELINE = ['pending', 'posted', 'in_transit', 'delivered'] as const;
type StatusStep = typeof STATUS_PIPELINE[number];

const STATUS_LABELS: Record<StatusStep, string> = {
    pending: 'Pendente',
    posted: 'Postado',
    in_transit: 'Em Trânsito',
    delivered: 'Entregue',
};

function getStepIndex(status: string): number {
    const idx = STATUS_PIPELINE.indexOf(status as StatusStep);
    return idx >= 0 ? idx : -1; // -1 for exception/cancelled
}

function Timeline({ status }: { status: string }) {
    const currentIdx = getStepIndex(status);
    const isException = status === 'exception' || status === 'cancelled';

    return (
        <ol className="flex items-center gap-0 w-full mt-2">
            {STATUS_PIPELINE.map((step, i) => {
                const done = currentIdx > i;
                const active = currentIdx === i && !isException;
                const isLast = i === STATUS_PIPELINE.length - 1;

                return (
                    <li key={step} className="flex-1 flex flex-col items-center relative">
                        {/* Connector line */}
                        {!isLast && (
                            <div className={`absolute top-3 left-1/2 w-full h-0.5 transition-colors ${done ? 'bg-emerald-500' : 'bg-[hsl(var(--ui-border))]'}`} />
                        )}
                        {/* Step icon */}
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${done
                                ? 'bg-emerald-500 text-white'
                                : active
                                    ? 'bg-[hsl(var(--ui-accent-blue))] text-white ring-4 ring-[hsl(var(--ui-accent-blue)/0.2)]'
                                    : 'bg-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))]'
                            }`}>
                            {done
                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : active
                                    ? <Clock className="w-3.5 h-3.5 animate-pulse" />
                                    : <Circle className="w-3.5 h-3.5" />
                            }
                        </div>
                        <span className={`mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-center ${done || active ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-muted))]'
                            }`}>
                            {STATUS_LABELS[step]}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

function ShipmentCard({ row }: { row: ShipmentRow }) {
    const isException = row.status === 'exception';
    const isCancelled = row.status === 'cancelled';

    return (
        <div className={`rounded-xl border bg-[hsl(var(--ui-surface))] p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${isException ? 'border-red-500/30' : isCancelled ? 'border-gray-500/20' : 'border-[hsl(var(--ui-border))]'
            }`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[10px] text-[hsl(var(--ui-text-muted))] font-medium uppercase tracking-wider">
                        {row.carrier} · {row.service}
                    </p>
                    <p className="font-mono text-[hsl(var(--ui-text))] font-semibold text-sm mt-0.5">
                        {row.trackingCode ?? <span className="text-[hsl(var(--ui-text-muted))] text-xs italic">Sem código de rastreio</span>}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    {row.shipmentPrice !== null && (
                        <p className="text-sm font-bold text-emerald-600">R$ {row.shipmentPrice.toFixed(2)}</p>
                    )}
                    <p className="text-[10px] text-[hsl(var(--ui-text-muted))] mt-0.5">
                        {new Date(row.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>

            {/* Exception / cancelled banner */}
            {isException && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-600">
                    ⚠️ Exceção detectada neste envio
                </div>
            )}
            {isCancelled && (
                <div className="rounded-lg bg-gray-500/10 border border-gray-500/20 px-3 py-2 text-xs font-semibold text-gray-500">
                    Envio cancelado
                </div>
            )}

            {/* Timeline */}
            {!isCancelled && <Timeline status={row.status} />}
        </div>
    );
}

export function RastreamentoClient() {
    const [rows, setRows] = useState<ShipmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await safeFetch('/api/freight/shipments');
            const json = await res.json();
            if (json.ok) {
                setRows(json.data);
            } else {
                setError('Falha ao carregar rastreamento');
            }
        } catch {
            setError('Erro de conexão');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="max-w-[900px] mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    Rastreamento de Envios
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Timeline de status por envio — atualizada via webhook Melhor Envio
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-16">
                    <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                </div>
            ) : error ? (
                <div className="p-8 text-center text-sm text-red-500">{error}</div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3">
                    <Navigation className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.4)]" />
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] italic">
                        Nenhum envio registrado ainda
                    </p>
                    <p className="text-xs text-[hsl(var(--ui-text-muted)/0.7)] max-w-xs text-center">
                        Os envios criados a partir do simulador aparecerão aqui com sua timeline de status.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rows.map(row => <ShipmentCard key={row.id} row={row} />)}
                </div>
            )}
        </div>
    );
}
