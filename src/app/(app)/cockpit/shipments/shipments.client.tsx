'use client';

import { useState, useEffect } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Package, Truck, Calendar, MapPin, Hash, CheckCircle2 } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShipmentRow {
    id: string;
    simulationId: string | null;
    carrier: string;
    service: string;
    trackingCode: string | null;
    shipmentPrice: string | null;
    status: string;
    createdAt: string;
}

export function ShipmentsClient() {
    const [shipments, setShipments] = useState<ShipmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await safeFetch('/api/internal/freight/shipments');
            const data = await res.json();
            if (data.ok) {
                setShipments(data.data);
            } else {
                setError(data.error || 'Failed to load shipments');
            }
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const statusMap: Record<string, { label: string, color: string }> = {
        'pending': { label: 'Pendente', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' },
        'posted': { label: 'Postado', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
        'in_transit': { label: 'Em Trânsito', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' },
        'delivered': { label: 'Entregue', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
        'cancelled': { label: 'Cancelado', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
    };

    const fmtMoney = (val: string | null) => {
        if (!val) return '—';
        return `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;
    };

    return (
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                        <Package className="w-5 h-5 text-[hsl(var(--ui-accent-blue))]" />
                        Embarques (Etiquetas)
                    </h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                        Gerencie suas etiquetas geradas e acompanhe rastreios
                    </p>
                </div>
                <button onClick={loadData} disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-bg))] transition-colors text-[hsl(var(--ui-text))]">
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden flex flex-col min-h-[400px]">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--ui-accent-blue)/0.3)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                    </div>
                ) : shipments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <Truck className="w-12 h-12 text-[hsl(var(--ui-text-muted)/0.3)] mb-4" />
                        <h3 className="text-base font-semibold text-[hsl(var(--ui-text))]">Nenhum embarque gerado</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1 max-w-sm">
                            As etiquetas geradas através do simulador de frete aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg)/0.5)]">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Data</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Transportadora</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Rastreio</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Custo Emitido</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--ui-border)/0.5)]">
                                {shipments.map(s => {
                                    const st = statusMap[s.status] || { label: s.status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };

                                    return (
                                        <tr key={s.id} className="hover:bg-[hsl(var(--ui-bg)/0.3)] transition-colors">
                                            <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--ui-text))]">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))]" />
                                                    {formatDate(new Date(s.createdAt), "dd MMM HH:mm", { locale: ptBR })}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-[hsl(var(--ui-text))]">{s.carrier}</span>
                                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{s.service}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {s.trackingCode ? (
                                                    <div className="flex items-center gap-1.5 font-mono text-xs text-[hsl(var(--ui-accent-blue))]">
                                                        <Hash className="w-3.5 h-3.5" />
                                                        {s.trackingCode}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[hsl(var(--ui-text-muted))] italic">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap tabular-nums font-semibold text-[hsl(var(--ui-text))]">
                                                {fmtMoney(s.shipmentPrice)}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${st.color}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
