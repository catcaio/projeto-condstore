'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Brain, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const CONFIDENCE_ICONS = {
    high: { icon: ShieldCheck, color: 'text-emerald-500', label: 'Alta' },
    medium: { icon: Shield, color: 'text-amber-500', label: 'Média' },
    low: { icon: ShieldAlert, color: 'text-gray-400', label: 'Baixa' },
} as const;

export function FreightMemoryClient() {
    const [memory, setMemory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await safeFetch('/api/internal/freight/memory');
            const data = await res.json();
            if (data.ok) setMemory(data.data.memory);
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
                    <Brain className="w-5 h-5" /> Memória de Frete
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Padrões recorrentes de frete baseados em confirmações históricas
                </p>
            </div>

            {memory.length === 0 ? (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 text-center">
                    <Brain className="w-10 h-10 mx-auto text-[hsl(var(--ui-text-muted))] opacity-30 mb-3" />
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum padrão registrado ainda.</p>
                    <p className="text-xs text-[hsl(var(--ui-text-muted))] opacity-60 mt-1">Confirme cotações e execute a agregação para popular a memória.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                {['Prefixo CEP', 'Zona', 'Transportadora', 'Família', 'Faixa Peso', 'Frete Médio', 'Delta Médio', 'Confirmações', 'Confiança'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {memory.map((m: any) => {
                                const conf = CONFIDENCE_ICONS[m.confidenceScore as keyof typeof CONFIDENCE_ICONS] || CONFIDENCE_ICONS.low;
                                const ConfIcon = conf.icon;
                                return (
                                    <tr key={m.id} className="border-b border-[hsl(var(--ui-border)/0.3)] hover:bg-[hsl(var(--ui-bg)/0.5)]">
                                        <td className="px-3 py-2 font-mono font-semibold text-[hsl(var(--ui-text))]">{m.cepPrefix}</td>
                                        <td className="px-3 py-2 text-[hsl(var(--ui-text))]">{m.zoneCode || '—'}</td>
                                        <td className="px-3 py-2 font-medium text-[hsl(var(--ui-text))]">{m.carrierName}</td>
                                        <td className="px-3 py-2 text-[hsl(var(--ui-text-muted))]">{m.productFamily || '—'}</td>
                                        <td className="px-3 py-2 tabular-nums">{m.weightBand || '—'}</td>
                                        <td className="px-3 py-2 tabular-nums font-semibold text-emerald-600">{m.avgConfirmedFreight ? `R$ ${parseFloat(m.avgConfirmedFreight).toFixed(2)}` : '—'}</td>
                                        <td className="px-3 py-2 tabular-nums text-[hsl(var(--ui-text-muted))]">{m.avgDelta ? `R$ ${parseFloat(m.avgDelta).toFixed(2)}` : '—'}</td>
                                        <td className="px-3 py-2 tabular-nums text-center font-semibold">{m.confirmationsCount}</td>
                                        <td className="px-3 py-2">
                                            <span className={`flex items-center gap-1 ${conf.color} text-[10px] font-semibold`}>
                                                <ConfIcon className="w-3.5 h-3.5" /> {conf.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] opacity-50">
                Memória é agregada automaticamente a partir de confirmações. Execute <code>npx tsx scripts/update-freight-memory.ts</code> para atualizar.
            </div>
        </div>
    );
}
