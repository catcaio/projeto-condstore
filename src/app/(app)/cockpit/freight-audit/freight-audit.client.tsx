'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { FileSearch, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function FreightAuditClient() {
    const [simulations, setSimulations] = useState<any[]>([]);
    const [confirmations, setConfirmations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'simulations' | 'confirmations'>('simulations');

    const load = useCallback(async () => {
        try {
            const res = await safeFetch('/api/internal/freight/audit?limit=50');
            const data = await res.json();
            if (data.ok) {
                setSimulations(data.data.simulations);
                setConfirmations(data.data.confirmations);
            }
        } catch { /* noop */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                    <FileSearch className="w-5 h-5" /> Auditoria de Frete
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Histórico de simulações e confirmações de frete
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] p-1 w-fit">
                {(['simulations', 'confirmations'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t
                            ? 'bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] shadow-sm'
                            : 'text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))]'
                            }`}>
                        {t === 'simulations' ? `Simulações (${simulations.length})` : `Confirmações (${confirmations.length})`}
                    </button>
                ))}
            </div>

            {tab === 'simulations' && (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                {['Data', 'CEP', 'Zona', 'Transportadora', 'Peso Cobrado', 'Volumes', 'Frete Cotado', 'Fonte Dims', 'Versão Regra'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {simulations.length === 0 ? (
                                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-[hsl(var(--ui-text-muted))] italic">Nenhuma simulação registrada</td></tr>
                            ) : simulations.map((s: any) => (
                                <tr key={s.id} className="border-b border-[hsl(var(--ui-border)/0.3)] hover:bg-[hsl(var(--ui-bg)/0.5)]">
                                    <td className="px-3 py-2 tabular-nums text-[hsl(var(--ui-text-muted))]">{new Date(s.createdAt).toLocaleDateString('pt-BR')} {new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-3 py-2 font-mono text-[hsl(var(--ui-text))]">{s.cep}</td>
                                    <td className="px-3 py-2 text-[hsl(var(--ui-text))]">{s.zoneCode || '—'}</td>
                                    <td className="px-3 py-2 font-medium text-[hsl(var(--ui-text))]">{s.carrierSelected || '—'}</td>
                                    <td className="px-3 py-2 tabular-nums font-semibold text-[hsl(var(--ui-text))]">{parseFloat(s.chargedWeight).toFixed(1)} kg</td>
                                    <td className="px-3 py-2 tabular-nums text-center">{s.totalVolumes}</td>
                                    <td className="px-3 py-2 tabular-nums font-semibold text-emerald-600">{s.quotedFreight ? `R$ ${parseFloat(s.quotedFreight).toFixed(2)}` : '—'}</td>
                                    <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-[hsl(var(--ui-bg))] text-[10px] font-semibold">{s.dimensionSource || '—'}</span></td>
                                    <td className="px-3 py-2 tabular-nums text-center">{s.packingRuleVersion || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'confirmations' && (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                {['Data', 'CEP', 'Transportadora', 'Cotado', 'Confirmado', 'Delta', 'Status', 'Fonte'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {confirmations.length === 0 ? (
                                <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-[hsl(var(--ui-text-muted))] italic">Nenhuma confirmação registrada</td></tr>
                            ) : confirmations.map((c: any) => {
                                const delta = parseFloat(c.deltaValue) || 0;
                                return (
                                    <tr key={c.id} className="border-b border-[hsl(var(--ui-border)/0.3)] hover:bg-[hsl(var(--ui-bg)/0.5)]">
                                        <td className="px-3 py-2 tabular-nums text-[hsl(var(--ui-text-muted))]">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-3 py-2 font-mono text-[hsl(var(--ui-text))]">{c.cep}</td>
                                        <td className="px-3 py-2 font-medium text-[hsl(var(--ui-text))]">{c.carrierName}</td>
                                        <td className="px-3 py-2 tabular-nums">R$ {parseFloat(c.quotedFreight || 0).toFixed(2)}</td>
                                        <td className="px-3 py-2 tabular-nums font-semibold text-emerald-600">{c.confirmedFreight ? `R$ ${parseFloat(c.confirmedFreight).toFixed(2)}` : '—'}</td>
                                        <td className={`px-3 py-2 tabular-nums font-semibold flex items-center gap-1 ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-[hsl(var(--ui-text-muted))]'}`}>
                                            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                            {delta !== 0 ? `R$ ${Math.abs(delta).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600' :
                                                    c.status === 'ADJUSTED' ? 'bg-amber-500/10 text-amber-600' :
                                                        c.status === 'OVERRIDDEN' ? 'bg-red-500/10 text-red-600' :
                                                            c.status === 'CANCELLED' ? 'bg-gray-500/10 text-gray-500' :
                                                                'bg-blue-500/10 text-blue-600'
                                                }`}>{c.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-[hsl(var(--ui-text-muted))]">{c.confirmationSource || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
