'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { parseFreightSimulatorQueryState } from '@/modules/navigation/query-state';
import { mockOrders } from '@/modules/orders';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Truck, Package, Plus, Trash2, Calculator, MapPin, Weight, Box } from 'lucide-react';

interface VolumeRow {
    id: string;
    length: number;
    width: number;
    height: number;
    qty: number;
}

interface SimResult {
    state: string | null;
    totalVolumes: number;
    totalWeight: number;
    totalCubedWeight: number;
    chargedWeight: number;
    dimensionSource: string;
    volumeDetails: any[];
    results: {
        carrierName: string;
        zoneCode: string;
        breakdown: {
            carrierName: string;
            zoneCode: string;
            source?: string;
            serviceId?: number;
            realWeightKg: number;
            cubedWeightKg: number;
            chargedWeightKg: number;
            weightBand: number;
            basePrice: number;
            excessKgCharge: number;
            advCharge: number;
            grisCharge: number;
            tasCharge: number;
            trtCharge: number;
            pedagioCharge: number;
            emexCharge: number;
            txaCharge: number;
            fpkCharge: number;
            fvCharge: number;
            totalFreight: number;
            deliveryDays: number;
        } | null;
    }[];
    simulationId?: string;
}

const uid = () => Math.random().toString(36).slice(2, 8);

function parseCityState(cityLabel: string) {
    const [city, stateAbbr] = cityLabel.split(',').map((value) => value.trim());
    return {
        city: city ?? '',
        stateAbbr: stateAbbr ?? '',
    };
}

function parseMoneyInput(value: string) {
    return value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
}

export function FreightSimulatorClient() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseFreightSimulatorQueryState(searchParams),
        [querySignature, searchParams]
    );
    const contextualOrder = useMemo(
        () => (routeContext.orderId ? mockOrders.find((order) => order.id === routeContext.orderId) : undefined),
        [routeContext.orderId]
    );
    const [cep, setCep] = useState('');
    const [city, setCity] = useState('');
    const [uf, setUf] = useState('');
    const [insuranceValue, setInsuranceValue] = useState('');
    const [carrier, setCarrier] = useState('auto');
    const [totalWeight, setTotalWeight] = useState('');
    const [volumes, setVolumes] = useState<VolumeRow[]>([
        { id: uid(), length: 0, width: 0, height: 0, qty: 1 },
    ]);
    const [result, setResult] = useState<SimResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creatingLabel, setCreatingLabel] = useState<string | null>(null);
    const [labelSuccess, setLabelSuccess] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!contextualOrder) {
            return;
        }

        const destination = parseCityState(contextualOrder.customer.city);
        setCity(destination.city);
        setUf(destination.stateAbbr);
        setInsuranceValue(parseMoneyInput(contextualOrder.total));
        setResult(null);
        setError('');
    }, [contextualOrder]);

    const addRow = () => setVolumes(v => [...v, { id: uid(), length: 0, width: 0, height: 0, qty: 1 }]);
    const removeRow = (id: string) => setVolumes(v => v.filter(r => r.id !== id));
    const updateRow = (id: string, field: keyof VolumeRow, val: number) => {
        setVolumes(v => v.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const totalVolumes = volumes.reduce((s, v) => s + v.qty, 0);

    const simulate = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await safeFetch('/api/freight/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cep: cep.replace(/\D/g, ''),
                    insuranceValue: parseFloat(insuranceValue) || 0,
                    carrierName: carrier,
                    volumes: volumes.map(v => ({
                        length: v.length,
                        width: v.width,
                        height: v.height,
                        qty: v.qty,
                    })),
                    totalWeight: parseFloat(totalWeight) || 0,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setResult(data.data);
                if (data.data.state) setUf(data.data.state);
            } else {
                setError(data.error || 'Simulation failed');
            }
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShipment = async (carrierName: string, serviceId?: number, quotePrice?: number) => {
        if (!result?.simulationId || !serviceId) return;
        setCreatingLabel(carrierName);
        setError('');

        try {
            const res = await safeFetch('/api/freight/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    simulationId: result.simulationId,
                    carrierName,
                    serviceId,
                    quotePrice,
                    dimensions: {
                        weight: parseFloat(totalWeight),
                        length: volumes[0]?.length || 16,
                        width: volumes[0]?.width || 11,
                        height: volumes[0]?.height || 2,
                    },
                    originCep: '88131640', // Base CondStore Origin
                    recipient: {
                        name: 'Cliente Final',
                        phone: '48999999999',
                        email: 'cliente@example.com',
                        document: '00000000000',
                        address: 'Rua Destino',
                        number: '123',
                        district: 'Centro',
                        city: result.state ? city : 'São Paulo',
                        stateAbbr: result.state || 'SP',
                        countryId: 'BR',
                        postalCode: cep.replace(/\D/g, ''),
                    }
                })
            });
            const data = await res.json();
            if (data.ok) {
                setLabelSuccess(prev => ({ ...prev, [carrierName]: data.data.trackingCode }));
            } else {
                setError(data.error || 'Failed to create shipment');
            }
        } catch (e: any) {
            setError(e.message || 'Network error during shipment creation');
        } finally {
            setCreatingLabel(null);
        }
    };

    const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

    return (
        <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[hsl(var(--ui-accent-blue))]" />
                    Simulador de Frete Manual
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Cotação operacional com entrada manual de volumes e dimensões
                </p>
            </div>

            {contextualOrder ? (
                <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                                Contexto do pedido
                            </p>
                            <h2 className="mt-2 text-lg font-semibold text-[hsl(var(--ui-text))]">
                                Pedido #{contextualOrder.id} • {contextualOrder.customer.company}
                            </h2>
                            <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                                Destino {contextualOrder.customer.city} • canal {contextualOrder.channel} • owner {contextualOrder.owner}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={`/pedidos?pedido=${contextualOrder.id}`}
                                className="rounded-lg border border-[hsl(var(--ui-border))] px-3 py-2 text-sm font-medium text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-page))]"
                            >
                                Abrir pedido
                            </Link>
                            <Link
                                href={`/logistica?pedido=${contextualOrder.id}`}
                                className="rounded-lg border border-[hsl(var(--ui-border))] px-3 py-2 text-sm font-medium text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-page))]"
                            >
                                Ir para logística
                            </Link>
                        </div>
                    </div>
                </section>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: form */}
                <div className="lg:col-span-2 flex flex-col gap-5">
                    {/* Section A: Destination */}
                    <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-4 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> Destino / Informações
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">CEP Destino</label>
                                <input type="text" value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] tabular-nums" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Cidade</label>
                                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Auto"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">UF</label>
                                <input type="text" value={uf} onChange={e => setUf(e.target.value)} placeholder="Auto" readOnly={!!result?.state}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Valor Mercadoria</label>
                                <input type="number" value={insuranceValue} onChange={e => setInsuranceValue(e.target.value)} placeholder="0,00" step="0.01"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] tabular-nums" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Transportadora</label>
                            <select value={carrier} onChange={e => setCarrier(e.target.value)}
                                className="w-full md:w-48 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]">
                                <option value="auto">Automático (todas)</option>
                                <option value="MENGUE">Mengue</option>
                                <option value="BRASPRESS">Braspress</option>
                                <option value="MOVVI">Movvi</option>
                            </select>
                        </div>
                    </section>

                    {/* Section B: Summary */}
                    <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-4 flex items-center gap-1.5">
                            <Weight className="w-3.5 h-3.5" /> Resumo do Embarque
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Total de Volumes</label>
                                <div className="px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-bg)/0.5)] text-[hsl(var(--ui-text))] tabular-nums">
                                    {totalVolumes}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Peso Total (kg)</label>
                                <input type="number" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} placeholder="0" step="0.1"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] tabular-nums" />
                            </div>
                        </div>
                    </section>

                    {/* Section C: Volume Grid */}
                    <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5" /> Grade de Volumes
                            </h2>
                            <button onClick={addRow}
                                className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--ui-accent-blue))] hover:text-[hsl(var(--ui-accent-blue)/0.8)] transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Adicionar
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[hsl(var(--ui-border))]">
                                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Compr. (cm)</th>
                                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Larg. (cm)</th>
                                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Alt. (cm)</th>
                                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Qtd</th>
                                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Volumetria (m³)</th>
                                        <th className="px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {volumes.map(v => {
                                        const vol = (v.length * v.width * v.height * v.qty) / 1000000;
                                        return (
                                            <tr key={v.id} className="border-b border-[hsl(var(--ui-border)/0.3)]">
                                                <td className="px-2 py-1.5">
                                                    <input type="number" value={v.length || ''} onChange={e => updateRow(v.id, 'length', parseFloat(e.target.value) || 0)}
                                                        className="w-20 px-2 py-1.5 text-sm rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="number" value={v.width || ''} onChange={e => updateRow(v.id, 'width', parseFloat(e.target.value) || 0)}
                                                        className="w-20 px-2 py-1.5 text-sm rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="number" value={v.height || ''} onChange={e => updateRow(v.id, 'height', parseFloat(e.target.value) || 0)}
                                                        className="w-20 px-2 py-1.5 text-sm rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="number" value={v.qty || ''} onChange={e => updateRow(v.id, 'qty', parseInt(e.target.value) || 1)} min={1}
                                                        className="w-16 px-2 py-1.5 text-sm rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                                                </td>
                                                <td className="px-2 py-1.5 text-sm tabular-nums text-[hsl(var(--ui-text-muted))]">
                                                    {vol > 0 ? vol.toFixed(4) : '—'}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {volumes.length > 1 && (
                                                        <button onClick={() => removeRow(v.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Simulate Button */}
                    <button onClick={simulate} disabled={loading || !cep || !totalWeight}
                        className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue)/0.9)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                        {loading ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <><Calculator className="w-4 h-4" /> Simular Frete</>
                        )}
                    </button>

                    {error && (
                        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                            {error}
                        </div>
                    )}
                </div>

                {/* Right column: Result */}
                <div className="lg:col-span-1">
                    {result ? (
                        <div className="sticky top-6 flex flex-col gap-4">
                            {/* Summary card */}
                            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-3">Resumo da Simulação</h2>
                                <div className="space-y-2 text-sm">
                                    <Row label="UF" value={result.state || '—'} />
                                    <Row label="Volumes" value={String(result.totalVolumes)} />
                                    <Row label="Peso Real" value={`${result.totalWeight} kg`} />
                                    <Row label="Peso Cubado" value={`${result.totalCubedWeight} kg`} />
                                    <Row label="Peso Cobrado" value={`${result.chargedWeight} kg`} highlight />
                                    <Row label="Fonte Dimensão" value={result.dimensionSource} tag />
                                </div>
                            </div>

                            {/* Carrier results */}
                            {result.results.map(r => (
                                <div key={r.carrierName} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm text-[hsl(var(--ui-text))] flex items-center gap-1.5">
                                            <Truck className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" /> {r.carrierName}
                                        </h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] font-semibold">
                                            {r.zoneCode}
                                        </span>
                                    </div>
                                    {r.breakdown ? (
                                        <div className="space-y-1.5 text-sm">
                                            <Row label="Base" value={fmt(r.breakdown.basePrice)} />
                                            {r.breakdown.excessKgCharge > 0 && <Row label="Excedente kg" value={fmt(r.breakdown.excessKgCharge)} />}
                                            {r.breakdown.advCharge > 0 && <Row label="ADV" value={fmt(r.breakdown.advCharge)} />}
                                            {r.breakdown.grisCharge > 0 && <Row label="GRIS" value={fmt(r.breakdown.grisCharge)} />}
                                            {r.breakdown.tasCharge > 0 && <Row label="TAS" value={fmt(r.breakdown.tasCharge)} />}
                                            {r.breakdown.trtCharge > 0 && <Row label="TRT" value={fmt(r.breakdown.trtCharge)} />}
                                            {r.breakdown.pedagioCharge > 0 && <Row label="Pedágio" value={fmt(r.breakdown.pedagioCharge)} />}
                                            {r.breakdown.emexCharge > 0 && <Row label="EMEX" value={fmt(r.breakdown.emexCharge)} />}
                                            {r.breakdown.txaCharge > 0 && <Row label="TXA" value={fmt(r.breakdown.txaCharge)} />}
                                            {r.breakdown.fpkCharge > 0 && <Row label="FPK" value={fmt(r.breakdown.fpkCharge)} />}
                                            {r.breakdown.fvCharge > 0 && <Row label="FV" value={fmt(r.breakdown.fvCharge)} />}
                                            <div className="border-t border-[hsl(var(--ui-border))] pt-2 mt-2">
                                                <div className="border-t border-[hsl(var(--ui-border))] pt-2 mt-2 space-y-2">
                                                    <Row label="Total Frete" value={fmt(r.breakdown.totalFreight)} highlight />
                                                    <Row label="Prazo" value={`${r.breakdown.deliveryDays} dias`} />

                                                    {r.breakdown.source === 'melhor_envio' && !labelSuccess[r.carrierName] && (
                                                        <button
                                                            onClick={() => handleCreateShipment(r.carrierName, r.breakdown!.serviceId, r.breakdown!.totalFreight)}
                                                            disabled={creatingLabel === r.carrierName}
                                                            className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            {creatingLabel === r.carrierName ? 'Gerando Etiqueta...' : 'Gerar Etiqueta de Envio'}
                                                        </button>
                                                    )}
                                                    {labelSuccess[r.carrierName] && (
                                                        <div className="mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 flex items-center justify-between">
                                                            <span>Etiqueta Gerada ✅</span>
                                                            <span className="font-mono">{labelSuccess[r.carrierName]}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[hsl(var(--ui-text-muted))] italic">Sem cobertura para esta região</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.5)] p-10 flex flex-col items-center justify-center text-center">
                            <Package className="w-10 h-10 text-[hsl(var(--ui-text-muted)/0.3)] mb-3" />
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Preencha os dados e clique em <strong>Simular Frete</strong> para ver o resultado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, highlight, tag }: { label: string; value: string; highlight?: boolean; tag?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[hsl(var(--ui-text-muted))]">{label}</span>
            {tag ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                    {value}
                </span>
            ) : (
                <span className={`tabular-nums ${highlight ? 'font-bold text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text))]'}`}>{value}</span>
            )}
        </div>
    );
}
