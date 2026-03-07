'use client';

import { useState, useEffect } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Truck, MapPin, Table2, ChevronDown, ChevronRight } from 'lucide-react';

interface Policy {
    id: string; carrierName: string; originCity: string; originState: string;
    cubageFactor: string; weightThresholdExcess: string; deliveryTimeDaysBase: number;
    notes: string; isActive: boolean;
}

interface Zone {
    id: string; carrierName: string; zoneCode: string; regionName: string;
    capitalOrInterior: string; state: string; cepRangeStart: string; cepRangeEnd: string;
    isActive: boolean;
}

interface RateSummary {
    carrier_name: string; row_count: number; zone_count: number;
}

export function CarrierTablesClient() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [rateSummary, setRateSummary] = useState<RateSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await safeFetch('/api/internal/freight/carrier-tables');
                const data = await res.json();
                if (data.ok) {
                    setPolicies(data.data.policies);
                    setZones(data.data.zones);
                    setRateSummary(data.data.rateSummary);
                }
            } catch { /* noop */ } finally { setLoading(false); }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Tabelas de Transportadoras</h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    {policies.length} transportadoras · {zones.length} zonas · {rateSummary.reduce((a, r) => a + Number(r.row_count), 0)} faixas de preço
                </p>
            </div>

            {/* Policies */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                    <Truck className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" /> Políticas de Transportadoras
                </h2>
                <div className="grid gap-3 md:grid-cols-3">
                    {policies.map(p => (
                        <div key={p.id} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm text-[hsl(var(--ui-text))]">{p.carrierName}</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-700'}`}>
                                    {p.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                            <div className="space-y-1 text-xs text-[hsl(var(--ui-text-muted))]">
                                <div>Origem: <strong>{p.originCity}/{p.originState}</strong></div>
                                <div>Fator Cubagem: <strong>{p.cubageFactor} kg/m³</strong></div>
                                <div>Peso Excesso: <strong>{p.weightThresholdExcess} kg</strong></div>
                                <div>Prazo Base: <strong>{p.deliveryTimeDaysBase} dias</strong></div>
                            </div>
                            {p.notes && <p className="text-[10px] text-[hsl(var(--ui-text-muted))] mt-2 opacity-60">{p.notes}</p>}
                        </div>
                    ))}
                </div>
            </section>

            {/* Zones per carrier */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                    <MapPin className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" /> Zonas por Transportadora
                </h2>
                {policies.map(p => {
                    const carrierZonesFiltered = zones.filter(z => z.carrierName === p.carrierName);
                    const expanded = expandedCarrier === p.carrierName;
                    const summary = rateSummary.find(r => r.carrier_name === p.carrierName);
                    return (
                        <div key={p.carrierName} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden">
                            <button onClick={() => setExpandedCarrier(expanded ? null : p.carrierName)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--ui-surface-hover))] transition-colors">
                                <div className="flex items-center gap-2">
                                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <span className="font-medium text-sm text-[hsl(var(--ui-text))]">{p.carrierName}</span>
                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{carrierZonesFiltered.length} zonas</span>
                                </div>
                                {summary && (
                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">
                                        {summary.row_count} faixas de preço
                                    </span>
                                )}
                            </button>
                            {expanded && (
                                <div className="border-t border-[hsl(var(--ui-border))] overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                                <th className="px-4 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))]">Zona</th>
                                                <th className="px-4 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))]">Região</th>
                                                <th className="px-4 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))]">UF</th>
                                                <th className="px-4 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))]">Tipo</th>
                                                <th className="px-4 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))]">CEP Range</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carrierZonesFiltered.map(z => (
                                                <tr key={z.id} className="border-b border-[hsl(var(--ui-border)/0.3)]">
                                                    <td className="px-4 py-1.5 font-medium text-[hsl(var(--ui-text))]">{z.zoneCode}</td>
                                                    <td className="px-4 py-1.5 text-[hsl(var(--ui-text-muted))]">{z.regionName}</td>
                                                    <td className="px-4 py-1.5 text-[hsl(var(--ui-text))]">{z.state}</td>
                                                    <td className="px-4 py-1.5 text-[hsl(var(--ui-text-muted))]">{z.capitalOrInterior}</td>
                                                    <td className="px-4 py-1.5 text-[hsl(var(--ui-text-muted))] tabular-nums">
                                                        {z.cepRangeStart}–{z.cepRangeEnd}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </section>

            {/* Import summary */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                    <Table2 className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" /> Resumo de Importação
                </h2>
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Transportadora</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Zonas</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Faixas de Preço</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rateSummary.map(r => (
                                <tr key={r.carrier_name} className="border-b border-[hsl(var(--ui-border)/0.3)]">
                                    <td className="px-4 py-2 font-medium text-[hsl(var(--ui-text))]">{r.carrier_name}</td>
                                    <td className="px-4 py-2 text-center tabular-nums text-[hsl(var(--ui-text))]">{r.zone_count}</td>
                                    <td className="px-4 py-2 text-center tabular-nums text-[hsl(var(--ui-text))]">{r.row_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
