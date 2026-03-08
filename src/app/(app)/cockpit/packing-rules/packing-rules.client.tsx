'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Save, Box, Ruler, Shield, ToggleLeft, ToggleRight, Package } from 'lucide-react';

interface SettingEntry {
    value: string; isActive: boolean; id?: string; description?: string; category?: string;
}

interface PriorityRule {
    id: string; regionGroup: string; carrierName: string; priorityOrder: number; isActive: boolean;
}

const SETTING_LABELS: Record<string, { label: string; unit: string; icon: string }> = {
    max_identical_per_volume: { label: 'Máximo de itens idênticos por volume', unit: 'un', icon: '📦' },
    stacking_increment_cm: { label: 'Incremento de empilhamento', unit: 'cm', icon: '📐' },
    max_volume_length_cm: { label: 'Comprimento máximo do volume', unit: 'cm', icon: '📏' },
    max_volume_width_cm: { label: 'Largura máxima do volume', unit: 'cm', icon: '📏' },
    max_volume_height_cm: { label: 'Altura máxima do volume', unit: 'cm', icon: '📏' },
    absorb_smaller_items: { label: 'Absorver itens menores no volume base', unit: '', icon: '🧲' },
    absorb_weight_only: { label: 'Absorção afeta apenas peso', unit: '', icon: '⚖️' },
    default_origin_cep: { label: 'CEP de origem padrão', unit: '', icon: '📍' },
    default_cubage_factor: { label: 'Fator de cubagem padrão', unit: 'kg/m³', icon: '🧊' },
    default_unit_weight_kg: { label: 'Peso unitário padrão (fallback)', unit: 'kg', icon: '⚖️' },
    max_freight_options: { label: 'Máximo de opções de frete', unit: '', icon: '🚚' },
};

const CATEGORIES = [
    { key: 'packing', title: 'Regras de Empacotamento', icon: Box },
    { key: 'freight', title: 'Configurações de Frete', icon: Package },
];

async function patchSetting(key: string, value: string) {
    await safeFetch('/api/internal/freight/operational-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setting', key, value }),
    });
}

export function PackingRulesClient() {
    const [settings, setSettings] = useState<Record<string, SettingEntry>>({});
    const [priorities, setPriorities] = useState<PriorityRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [editKey, setEditKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const res = await safeFetch('/api/internal/freight/operational-settings');
            const data = await res.json();
            if (data.ok) {
                setSettings(data.data.settings);
                setPriorities(data.data.priorities);
            }
        } catch { /* noop */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const saveSetting = async (key: string, value: string) => {
        setSaving(true);
        setStatus(null);
        try {
            await patchSetting(key, value);
            setSettings(s => ({ ...s, [key]: { ...s[key], value } }));
            setEditKey(null);
            setStatus(`✅ ${SETTING_LABELS[key]?.label || key} atualizado`);
            setTimeout(() => setStatus(null), 3000);
        } catch (err: any) {
            setStatus(`❌ Erro: ${err.message || 'falha ao salvar'}`);
        } finally { setSaving(false); }
    };

    const toggleBool = async (key: string, current: string) => {
        const next = current === 'true' ? 'false' : 'true';
        await saveSetting(key, next);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[900px] mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Controles Operacionais</h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Gerencie todas as regras de empacotamento e parâmetros de frete diretamente no cockpit
                </p>
            </div>

            {status && (
                <div className="px-4 py-2 rounded-lg bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] text-sm">
                    {status}
                </div>
            )}

            {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const categorySettings = Object.entries(settings).filter(([k, v]) => {
                    const info = SETTING_LABELS[k];
                    if (!info) return false;
                    if (cat.key === 'packing') return k.startsWith('max_identical') || k.startsWith('stacking') || k.startsWith('max_volume') || k.startsWith('absorb');
                    return !k.startsWith('max_identical') && !k.startsWith('stacking') && !k.startsWith('max_volume') && !k.startsWith('absorb');
                });

                return (
                    <section key={cat.key} className="space-y-3">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" /> {cat.title}
                        </h2>
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] divide-y divide-[hsl(var(--ui-border)/0.5)]">
                            {categorySettings.map(([key, entry]) => {
                                const info = SETTING_LABELS[key] || { label: key, unit: '', icon: '⚙️' };
                                const isBool = key.startsWith('absorb');
                                const isEditing = editKey === key;

                                return (
                                    <div key={key} className="flex items-center justify-between px-4 py-3 gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-base">{info.icon}</span>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-[hsl(var(--ui-text))]">{info.label}</div>
                                                {info.unit && <div className="text-[10px] text-[hsl(var(--ui-text-muted))]">Unidade: {info.unit}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isBool ? (
                                                <button onClick={() => toggleBool(key, entry.value)} disabled={saving}
                                                    className="transition-colors">
                                                    {entry.value === 'true'
                                                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                        : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                                                </button>
                                            ) : isEditing ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input type="text" value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveSetting(key, editValue); if (e.key === 'Escape') setEditKey(null); }}
                                                        autoFocus
                                                        className="w-28 px-2 py-1 text-sm rounded border border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] tabular-nums focus:outline-none" />
                                                    <button onClick={() => saveSetting(key, editValue)} disabled={saving}
                                                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
                                                        <Save className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setEditKey(key); setEditValue(entry.value); }}
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] text-sm font-mono tabular-nums text-[hsl(var(--ui-text))] hover:border-[hsl(var(--ui-accent-blue))] transition-colors">
                                                    {entry.value}
                                                    {info.unit && <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">{info.unit}</span>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {/* Carrier Priority Rules */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Prioridade de Transportadoras por Região
                </h2>
                {priorities.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] italic px-1">
                        Nenhuma regra de prioridade cadastrada. Use a API ou o banco para criar regras iniciais.
                    </p>
                ) : (
                    <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[hsl(var(--ui-border))]">
                                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Região</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Transportadora</th>
                                    <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Prioridade</th>
                                    <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priorities.map(p => (
                                    <tr key={p.id} className="border-b border-[hsl(var(--ui-border)/0.3)]">
                                        <td className="px-4 py-2 font-medium text-[hsl(var(--ui-text))]">{p.regionGroup}</td>
                                        <td className="px-4 py-2 text-[hsl(var(--ui-text))]">{p.carrierName}</td>
                                        <td className="px-4 py-2 text-center tabular-nums">{p.priorityOrder}</td>
                                        <td className="px-4 py-2 text-center">
                                            {p.isActive
                                                ? <span className="text-emerald-500 text-xs font-semibold">Ativo</span>
                                                : <span className="text-gray-400 text-xs font-semibold">Inativo</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] opacity-50 pt-2">
                Todas as alterações são aplicadas em tempo real no motor de frete. Valores atualizados são usados na próxima cotação.
            </div>
        </div>
    );
}
