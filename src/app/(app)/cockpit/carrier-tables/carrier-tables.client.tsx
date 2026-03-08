'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Truck, MapPin, Table2, ChevronDown, ChevronRight, Save, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';

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

interface RateRow {
    id: string; carrierName: string; zoneCode: string; weightBandMax: string;
    basePrice: string; excessKgPrice: string; advPercent: string; advMin: string;
    grisPercent: string; grisMin: string; tasValue: string; trtPercent: string; trtMin: string;
    pedagioValue: string; pedagioFractionKg: string; emexValue: string; emexPercent: string;
    txaValue: string; fpkValue: string; fvPercent: string; deliveryTimeDays: number;
    isActive: boolean;
}

interface RateSummary {
    carrier_name: string; row_count: number; zone_count: number;
}

async function patchTable(table: string, id: string, fields: Record<string, any>) {
    await safeFetch('/api/internal/freight/carrier-tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, fields }),
    });
}

export function CarrierTablesClient() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [rates, setRates] = useState<RateRow[]>([]);
    const [rateSummary, setRateSummary] = useState<RateSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);
    const [expandedRates, setExpandedRates] = useState<string | null>(null);
    const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
    const [editFields, setEditFields] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const res = await safeFetch('/api/internal/freight/carrier-tables');
            const data = await res.json();
            if (data.ok) {
                setPolicies(data.data.policies);
                setZones(data.data.zones);
                setRates(data.data.rates || []);
                setRateSummary(data.data.rateSummary);
            }
        } catch { /* noop */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const toggleActive = async (table: string, id: string, current: boolean) => {
        setSaving(true);
        await patchTable(table, id, { isActive: !current });
        if (table === 'carrier_policies') setPolicies(p => p.map(x => x.id === id ? { ...x, isActive: !current } : x));
        if (table === 'carrier_zones') setZones(z => z.map(x => x.id === id ? { ...x, isActive: !current } : x));
        if (table === 'carrier_rate_rows') setRates(r => r.map(x => x.id === id ? { ...x, isActive: !current } : x));
        setSaving(false);
    };

    const savePolicy = async (id: string) => {
        setSaving(true);
        await patchTable('carrier_policies', id, editFields);
        setPolicies(p => p.map(x => x.id === id ? { ...x, ...editFields } : x));
        setEditingPolicy(null);
        setEditFields({});
        setSaving(false);
    };

    const saveRateField = async (id: string, field: string, value: string) => {
        setSaving(true);
        await patchTable('carrier_rate_rows', id, { [field]: value });
        setRates(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
        setSaving(false);
    };

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
                    {policies.map(p => {
                        const isEditing = editingPolicy === p.id;
                        return (
                            <div key={p.id} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-sm text-[hsl(var(--ui-text))]">{p.carrierName}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleActive('carrier_policies', p.id, p.isActive)}
                                            disabled={saving} className="transition-colors">
                                            {p.isActive
                                                ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                                : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                        </button>
                                        {!isEditing ? (
                                            <button onClick={() => { setEditingPolicy(p.id); setEditFields({ cubageFactor: p.cubageFactor, weightThresholdExcess: p.weightThresholdExcess, deliveryTimeDaysBase: p.deliveryTimeDaysBase }); }}
                                                className="text-[10px] font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline">Editar</button>
                                        ) : (
                                            <button onClick={() => savePolicy(p.id)} disabled={saving}
                                                className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline">
                                                <Save className="w-3 h-3" /> Salvar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs text-[hsl(var(--ui-text-muted))]">
                                    <div>Origem: <strong>{p.originCity}/{p.originState}</strong></div>
                                    <div className="flex items-center gap-1">Fator Cubagem:
                                        {isEditing ? (
                                            <input type="number" step="1" value={editFields.cubageFactor ?? p.cubageFactor}
                                                onChange={e => setEditFields(f => ({ ...f, cubageFactor: e.target.value }))}
                                                className="w-20 px-1.5 py-0.5 text-xs rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums" />
                                        ) : <strong>{p.cubageFactor} kg/m³</strong>}
                                    </div>
                                    <div className="flex items-center gap-1">Peso Excesso:
                                        {isEditing ? (
                                            <input type="number" step="1" value={editFields.weightThresholdExcess ?? p.weightThresholdExcess}
                                                onChange={e => setEditFields(f => ({ ...f, weightThresholdExcess: e.target.value }))}
                                                className="w-20 px-1.5 py-0.5 text-xs rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums" />
                                        ) : <strong>{p.weightThresholdExcess} kg</strong>}
                                    </div>
                                    <div className="flex items-center gap-1">Prazo Base:
                                        {isEditing ? (
                                            <input type="number" step="1" value={editFields.deliveryTimeDaysBase ?? p.deliveryTimeDaysBase}
                                                onChange={e => setEditFields(f => ({ ...f, deliveryTimeDaysBase: parseInt(e.target.value) || 0 }))}
                                                className="w-16 px-1.5 py-0.5 text-xs rounded border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums" />
                                        ) : <strong>{p.deliveryTimeDaysBase} dias</strong>}
                                    </div>
                                </div>
                                {p.notes && <p className="text-[10px] text-[hsl(var(--ui-text-muted))] mt-2 opacity-60">{p.notes}</p>}
                            </div>
                        );
                    })}
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
                                                <th className="px-4 py-2 text-center font-semibold text-[hsl(var(--ui-text-muted))]">Status</th>
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
                                                    <td className="px-4 py-1.5 text-center">
                                                        <button onClick={() => toggleActive('carrier_zones', z.id, z.isActive)} disabled={saving}>
                                                            {z.isActive
                                                                ? <ToggleRight className="w-4 h-4 text-emerald-500 inline" />
                                                                : <ToggleLeft className="w-4 h-4 text-gray-400 inline" />}
                                                        </button>
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

            {/* Rate Rows per carrier */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                    <DollarSign className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" /> Faixas de Preço por Transportadora
                </h2>
                {policies.map(p => {
                    const carrierRates = rates.filter(r => r.carrierName === p.carrierName);
                    const expanded = expandedRates === p.carrierName;
                    return (
                        <div key={`rates-${p.carrierName}`} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden">
                            <button onClick={() => setExpandedRates(expanded ? null : p.carrierName)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--ui-surface-hover))] transition-colors">
                                <div className="flex items-center gap-2">
                                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <span className="font-medium text-sm text-[hsl(var(--ui-text))]">{p.carrierName}</span>
                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{carrierRates.length} faixas</span>
                                </div>
                            </button>
                            {expanded && (
                                <div className="border-t border-[hsl(var(--ui-border))] overflow-x-auto">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-[hsl(var(--ui-border))]">
                                                {['Zona', 'Faixa kg', 'Base R$', 'Exc. kg', 'ADV %', 'GRIS %', 'TAS', 'TRT %', 'Pedágio', 'EMEX', 'TXA', 'FPK', 'FV %', 'Prazo', ''].map(h => (
                                                    <th key={h} className="px-2 py-2 text-left font-semibold text-[hsl(var(--ui-text-muted))] whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carrierRates.map(r => (
                                                <tr key={r.id} className="border-b border-[hsl(var(--ui-border)/0.3)]">
                                                    <td className="px-2 py-1 font-medium text-[hsl(var(--ui-text))] whitespace-nowrap">{r.zoneCode}</td>
                                                    <td className="px-2 py-1 tabular-nums">{r.weightBandMax}</td>
                                                    <EditableCell value={r.basePrice} onSave={v => saveRateField(r.id, 'basePrice', v)} />
                                                    <EditableCell value={r.excessKgPrice} onSave={v => saveRateField(r.id, 'excessKgPrice', v)} />
                                                    <EditableCell value={r.advPercent} onSave={v => saveRateField(r.id, 'advPercent', v)} />
                                                    <EditableCell value={r.grisPercent} onSave={v => saveRateField(r.id, 'grisPercent', v)} />
                                                    <EditableCell value={r.tasValue} onSave={v => saveRateField(r.id, 'tasValue', v)} />
                                                    <EditableCell value={r.trtPercent} onSave={v => saveRateField(r.id, 'trtPercent', v)} />
                                                    <EditableCell value={r.pedagioValue} onSave={v => saveRateField(r.id, 'pedagioValue', v)} />
                                                    <EditableCell value={r.emexValue} onSave={v => saveRateField(r.id, 'emexValue', v)} />
                                                    <EditableCell value={r.txaValue} onSave={v => saveRateField(r.id, 'txaValue', v)} />
                                                    <EditableCell value={r.fpkValue} onSave={v => saveRateField(r.id, 'fpkValue', v)} />
                                                    <EditableCell value={r.fvPercent} onSave={v => saveRateField(r.id, 'fvPercent', v)} />
                                                    <td className="px-2 py-1 tabular-nums">{r.deliveryTimeDays}d</td>
                                                    <td className="px-2 py-1">
                                                        <button onClick={() => toggleActive('carrier_rate_rows', r.id, r.isActive)} disabled={saving}>
                                                            {r.isActive
                                                                ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                                                                : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                                                        </button>
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

function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);

    if (editing) {
        return (
            <td className="px-2 py-1">
                <input type="text" value={val} onChange={e => setVal(e.target.value)}
                    onBlur={() => { setEditing(false); if (val !== value) onSave(val); }}
                    onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (val !== value) onSave(val); } }}
                    autoFocus
                    className="w-16 px-1 py-0.5 text-[11px] rounded border border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none" />
            </td>
        );
    }

    return (
        <td className="px-2 py-1 tabular-nums text-[hsl(var(--ui-text))] cursor-pointer hover:bg-[hsl(var(--ui-accent-blue)/0.05)] rounded transition-colors"
            onClick={() => { setEditing(true); setVal(value); }}>
            {parseFloat(value) === 0 ? <span className="text-[hsl(var(--ui-text-muted)/0.4)]">—</span> : value}
        </td>
    );
}
