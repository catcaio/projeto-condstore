'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { TextField } from '@/ui/components/text-field';
import { Save, CheckCircle2 } from 'lucide-react';
import { updateCarrierPolicy, updateCarrierZone, updateCarrierRate } from './actions';

export function PolicyEditor({ carrierName, initialPolicy }: { carrierName: string, initialPolicy: any }) {
    const [formData, setFormData] = useState({
        isActive: initialPolicy.isActive,
        originCity: initialPolicy.originCity || '',
        originState: initialPolicy.originState || '',
        cubageFactor: String(initialPolicy.cubageFactor || '300.00'),
        deliveryTimeDaysBase: initialPolicy.deliveryTimeDaysBase || 0
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCarrierPolicy(carrierName, formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert('Falha ao salvar');
        }
        setSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Regras Gerais e Origem</CardTitle>
                <CardDescription>Defina as informações estáticas da tabela.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-[hsl(var(--ui-bg))] p-3 rounded-lg border border-[hsl(var(--ui-border))]">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-[hsl(var(--ui-border-active))] text-[hsl(var(--ui-accent-blue))]"
                    />
                    <span className="font-medium">Tabela Ativa para Cotações</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <TextField
                        label="Cidade Origem"
                        value={formData.originCity}
                        onChange={e => setFormData({ ...formData, originCity: e.target.value })}
                    />
                    <TextField
                        label="UF Origem"
                        value={formData.originState}
                        onChange={e => setFormData({ ...formData, originState: e.target.value })}
                        maxLength={2}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <TextField
                        label="Fator de Cubagem (kg/m³)"
                        value={formData.cubageFactor}
                        onChange={e => setFormData({ ...formData, cubageFactor: e.target.value })}
                    />
                    <TextField
                        label="Prazo Base (Dias)"
                        type="number"
                        value={formData.deliveryTimeDaysBase}
                        onChange={e => setFormData({ ...formData, deliveryTimeDaysBase: parseInt(e.target.value) || 0 })}
                    />
                </div>

                <div className="mt-2 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} variant="primary" className="gap-2">
                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved ? 'Salvo!' : 'Salvar Regras'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function ZonesEditor({ carrierName, zones }: { carrierName: string, zones: any[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const startEdit = (z: any) => {
        setEditingId(z.id);
        setFormData({
            id: z.id,
            isActive: z.isActive,
            state: z.state || '',
            cepRangeStart: z.cepRangeStart || '',
            cepRangeEnd: z.cepRangeEnd || '',
            notes: z.notes || ''
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCarrierZone(carrierName, formData);
            setEditingId(null);
        } catch (e) {
            alert('Falha ao salvar');
        }
        setSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Zonas de Cobertura</CardTitle>
                <CardDescription>Mapeamento de Regiões, UFs e faixas de CEP atendidas.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border border-[hsl(var(--ui-border))] rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] uppercase tracking-wide bg-[hsl(var(--ui-bg))] border-b border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))]">
                            <tr>
                                <th className="px-4 py-3">Cód. Zona</th>
                                <th className="px-4 py-3">UF</th>
                                <th className="px-4 py-3">CEP Inicial</th>
                                <th className="px-4 py-3">CEP Final</th>
                                <th className="px-4 py-3 font-medium text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                            {zones.map((z) => (
                                <tr key={z.id} className="hover:bg-[hsl(var(--ui-bg-light))]">
                                    {editingId === z.id ? (
                                        <>
                                            <td className="px-4 py-2 font-mono text-xs text-[hsl(var(--ui-text-muted))]">{z.zoneCode}</td>
                                            <td className="px-4 py-2">
                                                <input className="w-12 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2 tracking-wide" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input className="w-24 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" placeholder="00000000" value={formData.cepRangeStart} onChange={e => setFormData({ ...formData, cepRangeStart: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input className="w-24 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" placeholder="99999999" value={formData.cepRangeEnd} onChange={e => setFormData({ ...formData, cepRangeEnd: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>Salvar</Button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 font-mono text-xs">{z.zoneCode}</td>
                                            <td className="px-4 py-3">{z.state}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{z.cepRangeStart || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{z.cepRangeEnd || '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="secondary" onClick={() => startEdit(z)}>Editar</Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

export function RatesEditor({ carrierName, rates }: { carrierName: string, rates: any[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const startEdit = (r: any) => {
        setEditingId(r.id);
        setFormData({
            id: r.id,
            isActive: r.isActive,
            weightBandMax: String(r.weightBandMax),
            basePrice: String(r.basePrice),
            deliveryTimeDays: r.deliveryTimeDays,
            excessKgPrice: String(r.excessKgPrice),
            advPercent: String(r.advPercent)
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCarrierRate(carrierName, formData);
            setEditingId(null);
        } catch (e) {
            alert('Falha ao salvar');
        }
        setSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tarifas por Zona e Peso</CardTitle>
                <CardDescription>Custo base, frações excedentes, prazos fixos por faixa e impostos atrelados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border border-[hsl(var(--ui-border))] rounded-lg overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-[11px] uppercase tracking-wide bg-[hsl(var(--ui-bg))] border-b border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))]">
                            <tr>
                                <th className="px-4 py-3">Zona</th>
                                <th className="px-4 py-3">Peso Máx (kg)</th>
                                <th className="px-4 py-3">Preço Base (R$)</th>
                                <th className="px-4 py-3">Dias Adic.</th>
                                <th className="px-4 py-3">Kg Excedente (R$)</th>
                                <th className="px-4 py-3">% ADV</th>
                                <th className="px-4 py-3 font-medium text-right sticky right-0 bg-[hsl(var(--ui-bg))]">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                            {rates.map((r) => (
                                <tr key={r.id} className="hover:bg-[hsl(var(--ui-bg-light))]">
                                    {editingId === r.id ? (
                                        <>
                                            <td className="px-4 py-2 font-mono text-xs">{r.zoneCode}</td>
                                            <td className="px-4 py-2">
                                                <input className="w-16 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" value={formData.weightBandMax} onChange={e => setFormData({ ...formData, weightBandMax: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input className="w-20 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" className="w-12 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" value={formData.deliveryTimeDays || ''} onChange={e => setFormData({ ...formData, deliveryTimeDays: parseInt(e.target.value) || null })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input className="w-20 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" value={formData.excessKgPrice} onChange={e => setFormData({ ...formData, excessKgPrice: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input className="w-16 text-sm bg-transparent border border-[hsl(var(--ui-border))] rounded px-2" value={formData.advPercent} onChange={e => setFormData({ ...formData, advPercent: e.target.value })} />
                                            </td>
                                            <td className="px-4 py-2 text-right sticky right-0 bg-[hsl(var(--ui-bg-light))]">
                                                <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>Salvar</Button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--ui-text-muted))]">{r.zoneCode}</td>
                                            <td className="px-4 py-3">{r.weightBandMax} kg</td>
                                            <td className="px-4 py-3 font-mono">R$ {r.basePrice}</td>
                                            <td className="px-4 py-3">{r.deliveryTimeDays ? `+${r.deliveryTimeDays}d` : '-'}</td>
                                            <td className="px-4 py-3 font-mono">R$ {r.excessKgPrice} /kg</td>
                                            <td className="px-4 py-3">{Number(r.advPercent) * 100}%</td>
                                            <td className="px-4 py-3 text-right sticky right-0 bg-[hsl(var(--ui-bg-light))] hover:bg-transparent">
                                                <Button size="sm" variant="secondary" onClick={() => startEdit(r)}>Editar</Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
