'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Package, Plus, X, ChevronDown, ToggleLeft, ToggleRight, ArrowRight, Calculator, Pencil } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PackingProfile {
    id: string;
    tenantId: string;
    productRef: string | null;
    profileName: string;
    baseHeight: string;
    baseWidth: string;
    baseLength: string;
    baseWeight: string;
    packingMode: string;
    stackable: boolean;
    nestable: boolean;
    requiresOwnBox: boolean;
    heightIncrementPerExtraUnit: string;
    widthIncrementPerExtraUnit: string;
    lengthIncrementPerExtraUnit: string;
    maxUnitsPerVolume: number;
    reviewStatus: string;
    isActive: boolean;
    source: string;
    createdAt: string;
    updatedAt: string;
}

type FormData = {
    profileName: string;
    productRef: string;
    baseHeight: string;
    baseWidth: string;
    baseLength: string;
    baseWeight: string;
    packingMode: string;
    stackable: boolean;
    nestable: boolean;
    requiresOwnBox: boolean;
    heightIncrementPerExtraUnit: string;
    widthIncrementPerExtraUnit: string;
    lengthIncrementPerExtraUnit: string;
    maxUnitsPerVolume: string;
    source: string;
};

const EMPTY_FORM: FormData = {
    profileName: '', productRef: '',
    baseHeight: '0', baseWidth: '0', baseLength: '0', baseWeight: '0',
    packingMode: 'SINGLE_FIXED',
    stackable: false, nestable: false, requiresOwnBox: false,
    heightIncrementPerExtraUnit: '0', widthIncrementPerExtraUnit: '0', lengthIncrementPerExtraUnit: '0',
    maxUnitsPerVolume: '1', source: 'MANUAL',
};

const PACKING_MODES = [
    { value: 'SINGLE_FIXED', label: 'Fixo (unidade)' },
    { value: 'STACK_VERTICAL', label: 'Empilhar Vertical' },
    { value: 'STACK_HORIZONTAL', label: 'Empilhar Horizontal' },
    { value: 'NESTED', label: 'Encaixável' },
    { value: 'CUSTOM_RULE', label: 'Regra customizada' },
];

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    REVIEWED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Rascunho',
    REVIEWED: 'Revisado',
    ACTIVE: 'Ativo',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['REVIEWED'],
    REVIEWED: ['ACTIVE', 'DRAFT'],
    ACTIVE: ['REVIEWED'],
};

// ─── Component ──────────────────────────────────────────────────────────────

export function PackingProfilesClient() {
    const [profiles, setProfiles] = useState<PackingProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterSource, setFilterSource] = useState<string>('');
    const [filterActive, setFilterActive] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [simQty, setSimQty] = useState(1);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('review_status', filterStatus);
            if (filterSource) params.set('source', filterSource);
            if (filterActive) params.set('is_active', filterActive);
            if (searchQuery) params.set('q', searchQuery);

            const res = await safeFetch(`/api/internal/freight/packing-profiles?${params.toString()}`);
            const data = await res.json();
            if (data.ok) setProfiles(data.data);
        } catch {
            setError('Erro ao carregar perfis');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterSource, filterActive, searchQuery]);

    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
        setSimQty(1);
    };

    const openEdit = (p: PackingProfile) => {
        setEditingId(p.id);
        setForm({
            profileName: p.profileName,
            productRef: p.productRef || '',
            baseHeight: p.baseHeight,
            baseWidth: p.baseWidth,
            baseLength: p.baseLength,
            baseWeight: p.baseWeight,
            packingMode: p.packingMode,
            stackable: p.stackable,
            nestable: p.nestable,
            requiresOwnBox: p.requiresOwnBox,
            heightIncrementPerExtraUnit: p.heightIncrementPerExtraUnit,
            widthIncrementPerExtraUnit: p.widthIncrementPerExtraUnit,
            lengthIncrementPerExtraUnit: p.lengthIncrementPerExtraUnit,
            maxUnitsPerVolume: String(p.maxUnitsPerVolume),
            source: p.source,
        });
        setShowForm(true);
        setSimQty(1);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const url = editingId
                ? `/api/internal/freight/packing-profiles/${editingId}`
                : '/api/internal/freight/packing-profiles';
            const method = editingId ? 'PUT' : 'POST';

            const res = await safeFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.ok) {
                setError(data.message || 'Erro ao salvar');
                return;
            }
            setShowForm(false);
            fetchProfiles();
        } catch {
            setError('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await safeFetch(`/api/internal/freight/packing-profiles/${id}/toggle`, { method: 'PATCH' });
            fetchProfiles();
        } catch { /* ignore */ }
    };

    const handleReviewStatus = async (id: string, newStatus: string) => {
        try {
            await safeFetch(`/api/internal/freight/packing-profiles/${id}/review-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewStatus: newStatus }),
            });
            fetchProfiles();
        } catch { /* ignore */ }
    };

    // ─── Simulation preview ─────────────────────────────────────────────

    const simResult = computeSimulation(form, simQty);

    return (
        <div className="flex flex-col gap-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
                <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}
                    options={[{ value: '', label: 'Todos' }, { value: 'DRAFT', label: 'Rascunho' }, { value: 'REVIEWED', label: 'Revisado' }, { value: 'ACTIVE', label: 'Ativo' }]} />
                <FilterSelect label="Fonte" value={filterSource} onChange={setFilterSource}
                    options={[{ value: '', label: 'Todas' }, { value: 'MANUAL', label: 'Manual' }, { value: 'SITE_SCRAPE', label: 'Scraper' }]} />
                <FilterSelect label="Ativo" value={filterActive} onChange={setFilterActive}
                    options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] placeholder:text-[hsl(var(--ui-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] flex-1 min-w-[180px]"
                />
                <button onClick={openCreate}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Novo Perfil
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Form Panel */}
            {showForm && (
                <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--ui-border))]">
                        <h3 className="font-semibold text-[hsl(var(--ui-text))]">
                            {editingId ? 'Editar Perfil' : 'Novo Perfil de Embalagem'}
                        </h3>
                        <button onClick={() => setShowForm(false)}
                            className="p-1 rounded-md hover:bg-[hsl(var(--ui-surface-hover))] text-[hsl(var(--ui-text-muted))]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormInput label="Nome do Perfil *" value={form.profileName}
                            onChange={v => setForm(f => ({ ...f, profileName: v }))} />
                        <FormInput label="Referência do Produto" value={form.productRef}
                            onChange={v => setForm(f => ({ ...f, productRef: v }))} />
                        <FormSelect label="Modo de Embalagem" value={form.packingMode}
                            onChange={v => setForm(f => ({ ...f, packingMode: v }))}
                            options={PACKING_MODES} />

                        <FormInput label="Altura Base (cm)" type="number" value={form.baseHeight}
                            onChange={v => setForm(f => ({ ...f, baseHeight: v }))} />
                        <FormInput label="Largura Base (cm)" type="number" value={form.baseWidth}
                            onChange={v => setForm(f => ({ ...f, baseWidth: v }))} />
                        <FormInput label="Comprimento Base (cm)" type="number" value={form.baseLength}
                            onChange={v => setForm(f => ({ ...f, baseLength: v }))} />

                        <FormInput label="Peso Base (kg)" type="number" value={form.baseWeight}
                            onChange={v => setForm(f => ({ ...f, baseWeight: v }))} />
                        <FormInput label="Max. unidades por volume" type="number" value={form.maxUnitsPerVolume}
                            onChange={v => setForm(f => ({ ...f, maxUnitsPerVolume: v }))} />
                        <FormSelect label="Fonte" value={form.source}
                            onChange={v => setForm(f => ({ ...f, source: v }))}
                            options={[{ value: 'MANUAL', label: 'Manual' }, { value: 'SITE_SCRAPE', label: 'Scraper' }]} />

                        <FormInput label="Δ Altura/unidade (cm)" type="number"
                            value={form.heightIncrementPerExtraUnit}
                            onChange={v => setForm(f => ({ ...f, heightIncrementPerExtraUnit: v }))} />
                        <FormInput label="Δ Largura/unidade (cm)" type="number"
                            value={form.widthIncrementPerExtraUnit}
                            onChange={v => setForm(f => ({ ...f, widthIncrementPerExtraUnit: v }))} />
                        <FormInput label="Δ Comprimento/unidade (cm)" type="number"
                            value={form.lengthIncrementPerExtraUnit}
                            onChange={v => setForm(f => ({ ...f, lengthIncrementPerExtraUnit: v }))} />

                        <FormCheckbox label="Empilhável" checked={form.stackable}
                            onChange={v => setForm(f => ({ ...f, stackable: v }))} />
                        <FormCheckbox label="Encaixável" checked={form.nestable}
                            onChange={v => setForm(f => ({ ...f, nestable: v }))} />
                        <FormCheckbox label="Requer caixa própria" checked={form.requiresOwnBox}
                            onChange={v => setForm(f => ({ ...f, requiresOwnBox: v }))} />
                    </div>

                    {/* Simulation Preview */}
                    <div className="px-6 py-4 border-t border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-background))]">
                        <div className="flex items-center gap-3 mb-3">
                            <Calculator className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                            <h4 className="font-semibold text-sm text-[hsl(var(--ui-text))]">Simulação de Embalagem</h4>
                        </div>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">Quantidade</label>
                                <input type="number" min={1} max={999} value={simQty}
                                    onChange={e => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="h-9 w-24 px-3 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
                            </div>
                            <div className="flex gap-6 items-center">
                                <SimMetric label="Dimensões" value={`${simResult.h.toFixed(1)} × ${simResult.w.toFixed(1)} × ${simResult.l.toFixed(1)} cm`} />
                                <SimMetric label="Peso Total" value={`${simResult.weight.toFixed(2)} kg`} />
                                <SimMetric label="Cubagem" value={`${simResult.cubage.toFixed(4)} m³`} />
                                <SimMetric label="Volumes" value={String(simResult.volumes)} />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-[hsl(var(--ui-border))] flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)}
                            className="h-9 px-4 rounded-lg border border-[hsl(var(--ui-border))] text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface-hover))] transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="h-9 px-5 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                            {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Perfil'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="w-8 h-8 rounded-full border-4 border-[hsl(var(--ui-accent-blue)/0.3)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                </div>
            ) : profiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-center py-16 px-8">
                    <Package className="w-12 h-12 mx-auto text-[hsl(var(--ui-text-muted))] mb-4 opacity-40" />
                    <h3 className="font-semibold text-[hsl(var(--ui-text))] mb-1">Nenhum perfil encontrado</h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-4">Crie o primeiro perfil de embalagem para começar.</p>
                    <button onClick={openCreate}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Criar Perfil
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-background))]">
                                    <th className="px-4 py-3 text-left font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Nome</th>
                                    <th className="px-4 py-3 text-left font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Dimensões (cm)</th>
                                    <th className="px-4 py-3 text-left font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Peso</th>
                                    <th className="px-4 py-3 text-left font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Modo</th>
                                    <th className="px-4 py-3 text-center font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-center font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Ativo</th>
                                    <th className="px-4 py-3 text-right font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                                {profiles.map(p => (
                                    <tr key={p.id} className="hover:bg-[hsl(var(--ui-surface-hover))] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[hsl(var(--ui-text))]">{p.profileName}</div>
                                            {p.productRef && <div className="text-xs text-[hsl(var(--ui-text-muted))]">{p.productRef}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--ui-text))] tabular-nums">
                                            {p.baseHeight} × {p.baseWidth} × {p.baseLength}
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--ui-text))] tabular-nums">{p.baseWeight} kg</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">
                                                {PACKING_MODES.find(m => m.value === p.packingMode)?.label || p.packingMode}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[p.reviewStatus] || ''}`}>
                                                {STATUS_LABELS[p.reviewStatus] || p.reviewStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleToggle(p.id)}
                                                className="text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                                title={p.isActive ? 'Desativar' : 'Ativar'}>
                                                {p.isActive
                                                    ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                    : <ToggleLeft className="w-6 h-6" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(p)}
                                                    className="p-1.5 rounded-md hover:bg-[hsl(var(--ui-surface-hover))] text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                                    title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {(VALID_TRANSITIONS[p.reviewStatus] || []).map(nextStatus => (
                                                    <button key={nextStatus}
                                                        onClick={() => handleReviewStatus(p.id, nextStatus)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-hover))] text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                                        title={`Mover para ${STATUS_LABELS[nextStatus]}`}>
                                                        <ArrowRight className="w-3 h-3" />
                                                        {STATUS_LABELS[nextStatus]}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 border-t border-[hsl(var(--ui-border))] text-xs text-[hsl(var(--ui-text-muted))]">
                        {profiles.length} {profiles.length === 1 ? 'perfil' : 'perfis'} encontrado{profiles.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Simulation Logic ───────────────────────────────────────────────────────

function computeSimulation(form: FormData, qty: number) {
    const h = Number(form.baseHeight) || 0;
    const w = Number(form.baseWidth) || 0;
    const l = Number(form.baseLength) || 0;
    const weight = Number(form.baseWeight) || 0;
    const hInc = Number(form.heightIncrementPerExtraUnit) || 0;
    const wInc = Number(form.widthIncrementPerExtraUnit) || 0;
    const lInc = Number(form.lengthIncrementPerExtraUnit) || 0;
    const maxPerVolume = Number(form.maxUnitsPerVolume) || 1;
    const mode = form.packingMode;

    const volumes = Math.ceil(qty / maxPerVolume);
    const unitsInLastVolume = qty - (volumes - 1) * maxPerVolume;
    const fullVolumeUnits = maxPerVolume;

    // Calculate dimensions for the "worst-case" (fullest) volume
    const effectiveUnits = Math.min(qty, fullVolumeUnits);
    let packedH = h;
    let packedW = w;
    let packedL = l;

    switch (mode) {
        case 'STACK_VERTICAL':
            packedH = h + (effectiveUnits - 1) * hInc;
            break;
        case 'STACK_HORIZONTAL':
            packedW = w + (effectiveUnits - 1) * wInc;
            break;
        case 'NESTED':
            packedH = h + (effectiveUnits - 1) * hInc;
            break;
        case 'CUSTOM_RULE':
            packedH = h + (effectiveUnits - 1) * hInc;
            packedW = w + (effectiveUnits - 1) * wInc;
            packedL = l + (effectiveUnits - 1) * lInc;
            break;
        case 'SINGLE_FIXED':
        default:
            // Each unit is its own package
            break;
    }

    const cubage = (packedH * packedW * packedL) / 1_000_000; // cm³ → m³
    const totalWeight = weight * qty;

    return { h: packedH, w: packedW, l: packedL, weight: totalWeight, cubage: cubage * volumes, volumes };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] appearance-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] cursor-pointer">
                {options.map(o => <option key={o.value} value={o.value}>{label}: {o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-[hsl(var(--ui-text-muted))] pointer-events-none" />
        </div>
    );
}

function FormInput({ label, value, onChange, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                step={type === 'number' ? '0.01' : undefined}
                className="h-9 px-3 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
        </div>
    );
}

function FormSelect({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] appearance-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)]">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function FormCheckbox({ label, checked, onChange }: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer h-9 mt-auto">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                className="w-4 h-4 rounded border-[hsl(var(--ui-border))] text-[hsl(var(--ui-accent-blue))] focus:ring-[hsl(var(--ui-accent-blue)/0.3)]" />
            <span className="text-sm text-[hsl(var(--ui-text))]">{label}</span>
        </label>
    );
}

function SimMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">{label}</span>
            <span className="text-sm font-semibold text-[hsl(var(--ui-text))] tabular-nums">{value}</span>
        </div>
    );
}
