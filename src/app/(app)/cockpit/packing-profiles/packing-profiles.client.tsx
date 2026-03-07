'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import {
    Package, Plus, X, ChevronDown, ToggleLeft, ToggleRight, ArrowRight,
    Calculator, Pencil, AlertTriangle, Search, Filter, Check, Eye
} from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    DRAFT: { label: 'Rascunho', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    REVIEWED: { label: 'Revisado', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
    ACTIVE: { label: 'Ativo', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['REVIEWED'],
    REVIEWED: ['ACTIVE', 'DRAFT'],
    ACTIVE: ['REVIEWED'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isIncomplete(p: PackingProfile): boolean {
    const h = parseFloat(p.baseHeight);
    const w = parseFloat(p.baseWidth);
    const l = parseFloat(p.baseLength);
    const wt = parseFloat(p.baseWeight);
    return (h === 0 && w === 0 && l === 0) || wt === 0;
}

function classifyFamily(slug: string): string {
    if (/carrinho|carro|abastecedor|coletor/i.test(slug)) return 'Carrinhos';
    if (/lixeira|papeleira|contentor|conteiner|container/i.test(slug)) return 'Lixeiras';
    if (/bicicletario/i.test(slug)) return 'Bicicletários';
    if (/caixa.*correio|colmeia/i.test(slug)) return 'Caixas Correio';
    if (/quadro.*chave|porta.*chave|armario.*chave/i.test(slug)) return 'Quadros/Chaves';
    if (/kit|conjunto|doblo/i.test(slug)) return 'Kits';
    if (/espelho/i.test(slug)) return 'Espelhos';
    if (/mop|rodo|limpeza|balde/i.test(slug)) return 'Limpeza';
    return 'Outros';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PackingProfilesClient() {
    const [profiles, setProfiles] = useState<PackingProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterSource, setFilterSource] = useState<string>('');
    const [filterActive, setFilterActive] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<'all' | 'incomplete' | 'ready'>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [simQty, setSimQty] = useState(1);
    const [inspecting, setInspecting] = useState<string | null>(null);

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

    // ─── Derived stats ──────────────────────────────────────────────────

    const stats = useMemo(() => {
        const total = profiles.length;
        const incomplete = profiles.filter(isIncomplete).length;
        const draft = profiles.filter(p => p.reviewStatus === 'DRAFT').length;
        const reviewed = profiles.filter(p => p.reviewStatus === 'REVIEWED').length;
        const active = profiles.filter(p => p.reviewStatus === 'ACTIVE').length;
        const families = new Map<string, number>();
        profiles.forEach(p => {
            const f = classifyFamily(p.productRef || '');
            families.set(f, (families.get(f) || 0) + 1);
        });
        return { total, incomplete, draft, reviewed, active, families };
    }, [profiles]);

    const filteredProfiles = useMemo(() => {
        if (quickFilter === 'incomplete') return profiles.filter(isIncomplete);
        if (quickFilter === 'ready') return profiles.filter(p => !isIncomplete(p) && p.reviewStatus === 'DRAFT');
        return profiles;
    }, [profiles, quickFilter]);

    // ─── Actions ────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
        setSimQty(1);
        setInspecting(null);
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
            if (!data.ok) { setError(data.message || 'Erro ao salvar'); return; }
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
        } catch { /* noop */ }
    };

    const handleReviewStatus = async (id: string, newStatus: string) => {
        try {
            await safeFetch(`/api/internal/freight/packing-profiles/${id}/review-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewStatus: newStatus }),
            });
            fetchProfiles();
        } catch { /* noop */ }
    };

    const simResult = computeSimulation(form, simQty);

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col gap-5">
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Perfis de Embalagem</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                        {stats.total} perfis · {stats.incomplete} incompletos · {stats.draft} rascunhos
                    </p>
                </div>
                <button onClick={openCreate}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                    <Plus className="w-4 h-4" /> Novo Perfil
                </button>
            </div>

            {/* ── Quick filters (pill row) ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <QuickPill active={quickFilter === 'all'} onClick={() => setQuickFilter('all')}
                    badge={stats.total}>Todos</QuickPill>
                <QuickPill active={quickFilter === 'incomplete'} onClick={() => setQuickFilter('incomplete')}
                    badge={stats.incomplete} variant="warning">Incompletos</QuickPill>
                <QuickPill active={quickFilter === 'ready'} onClick={() => setQuickFilter('ready')}
                    badge={stats.draft - stats.incomplete}>Prontos p/ Revisão</QuickPill>

                <div className="w-px h-5 bg-[hsl(var(--ui-border))] mx-1" />

                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--ui-text-muted))] pointer-events-none" />
                    <input type="text" placeholder="Buscar perfil..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] placeholder:text-[hsl(var(--ui-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.2)]" />
                </div>

                {/* Dropdown filters */}
                <div className="flex gap-2 ml-auto">
                    <MiniSelect value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: '', label: 'Status' }, { value: 'DRAFT', label: 'Rascunho' }, { value: 'REVIEWED', label: 'Revisado' }, { value: 'ACTIVE', label: 'Ativo' }]} />
                    <MiniSelect value={filterSource} onChange={setFilterSource}
                        options={[{ value: '', label: 'Fonte' }, { value: 'MANUAL', label: 'Manual' }, { value: 'SITE_SCRAPE', label: 'Scraper' }]} />
                    <MiniSelect value={filterActive} onChange={setFilterActive}
                        options={[{ value: '', label: 'Ativação' }, { value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} />
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

            {/* ── Editor panel ── */}
            {showForm && (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--ui-border))]">
                        <h3 className="font-semibold text-sm text-[hsl(var(--ui-text))]">
                            {editingId ? '✏️ Editar Perfil' : '✨ Novo Perfil de Embalagem'}
                        </h3>
                        <button onClick={() => setShowForm(false)}
                            className="p-1 rounded-md hover:bg-[hsl(var(--ui-surface-hover))] text-[hsl(var(--ui-text-muted))]">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Identification */}
                        <FieldSection title="Identificação">
                            <FormInput label="Nome do Perfil *" value={form.profileName}
                                onChange={v => setForm(f => ({ ...f, profileName: v }))} />
                            <FormInput label="Referência (slug)" value={form.productRef}
                                onChange={v => setForm(f => ({ ...f, productRef: v }))} />
                            <FormSelect label="Modo de Embalagem" value={form.packingMode}
                                onChange={v => setForm(f => ({ ...f, packingMode: v }))}
                                options={PACKING_MODES} />
                        </FieldSection>

                        {/* Dimensions */}
                        <FieldSection title="Dimensões e Peso">
                            <FormInput label="Altura (cm)" type="number" value={form.baseHeight}
                                warn={form.baseHeight === '0' || form.baseHeight === '0.00'}
                                onChange={v => setForm(f => ({ ...f, baseHeight: v }))} />
                            <FormInput label="Largura (cm)" type="number" value={form.baseWidth}
                                warn={form.baseWidth === '0' || form.baseWidth === '0.00'}
                                onChange={v => setForm(f => ({ ...f, baseWidth: v }))} />
                            <FormInput label="Comprimento (cm)" type="number" value={form.baseLength}
                                warn={form.baseLength === '0' || form.baseLength === '0.00'}
                                onChange={v => setForm(f => ({ ...f, baseLength: v }))} />
                            <FormInput label="Peso (kg)" type="number" value={form.baseWeight}
                                warn={form.baseWeight === '0' || form.baseWeight === '0.00'}
                                onChange={v => setForm(f => ({ ...f, baseWeight: v }))} />
                        </FieldSection>

                        {/* Stacking */}
                        <FieldSection title="Comportamento de Empilhamento">
                            <FormInput label="Δ Altura/unidade" type="number"
                                value={form.heightIncrementPerExtraUnit}
                                onChange={v => setForm(f => ({ ...f, heightIncrementPerExtraUnit: v }))} />
                            <FormInput label="Δ Largura/unidade" type="number"
                                value={form.widthIncrementPerExtraUnit}
                                onChange={v => setForm(f => ({ ...f, widthIncrementPerExtraUnit: v }))} />
                            <FormInput label="Δ Comprimento/unidade" type="number"
                                value={form.lengthIncrementPerExtraUnit}
                                onChange={v => setForm(f => ({ ...f, lengthIncrementPerExtraUnit: v }))} />
                            <FormInput label="Máx. unidades/volume" type="number" value={form.maxUnitsPerVolume}
                                onChange={v => setForm(f => ({ ...f, maxUnitsPerVolume: v }))} />
                        </FieldSection>

                        {/* Properties */}
                        <FieldSection title="Propriedades">
                            <FormCheckbox label="Empilhável" checked={form.stackable}
                                onChange={v => setForm(f => ({ ...f, stackable: v }))} />
                            <FormCheckbox label="Encaixável" checked={form.nestable}
                                onChange={v => setForm(f => ({ ...f, nestable: v }))} />
                            <FormCheckbox label="Requer caixa própria" checked={form.requiresOwnBox}
                                onChange={v => setForm(f => ({ ...f, requiresOwnBox: v }))} />
                        </FieldSection>
                    </div>

                    {/* Simulation Preview */}
                    <div className="px-5 py-4 border-t border-[hsl(var(--ui-border))] bg-gradient-to-r from-[hsl(var(--ui-background))] to-[hsl(var(--ui-surface))]">
                        <div className="flex items-center gap-2 mb-3">
                            <Calculator className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Simulação</span>
                        </div>
                        <div className="flex flex-wrap items-end gap-5">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[hsl(var(--ui-text-muted))]">Qtd.</label>
                                <input type="number" min={1} max={999} value={simQty}
                                    onChange={e => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="h-8 w-20 px-2 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.2)]" />
                            </div>
                            <SimCard label="Dimensões" value={`${simResult.h.toFixed(0)} × ${simResult.w.toFixed(0)} × ${simResult.l.toFixed(0)} cm`} />
                            <SimCard label="Peso Total" value={`${simResult.weight.toFixed(1)} kg`} />
                            <SimCard label="Cubagem" value={`${simResult.cubage.toFixed(4)} m³`} />
                            <SimCard label="Volumes" value={String(simResult.volumes)} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3 border-t border-[hsl(var(--ui-border))] flex justify-end gap-2">
                        <button onClick={() => setShowForm(false)}
                            className="h-8 px-4 rounded-lg border border-[hsl(var(--ui-border))] text-sm text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface-hover))] transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="h-8 px-5 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
                            {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Profile list ── */}
            {loading ? (
                <div className="flex items-center justify-center p-16">
                    <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-center py-16">
                    <Package className="w-10 h-10 mx-auto text-[hsl(var(--ui-text-muted))] mb-3 opacity-30" />
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhum perfil encontrado com os filtros atuais.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[hsl(var(--ui-border))]">
                                    <Th>Produto</Th>
                                    <Th>Dimensões (cm)</Th>
                                    <Th>Peso</Th>
                                    <Th>Modo</Th>
                                    <Th align="center">Status</Th>
                                    <Th align="center">Ativo</Th>
                                    <Th align="right">Ações</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--ui-border)/0.5)]">
                                {filteredProfiles.map(p => {
                                    const incomplete = isIncomplete(p);
                                    const h = parseFloat(p.baseHeight);
                                    const w = parseFloat(p.baseWidth);
                                    const l = parseFloat(p.baseLength);
                                    const wt = parseFloat(p.baseWeight);
                                    const zeroDims = h === 0 && w === 0 && l === 0;
                                    const zeroWt = wt === 0;
                                    const status = STATUS_CONFIG[p.reviewStatus] || STATUS_CONFIG.DRAFT;
                                    const family = classifyFamily(p.productRef || '');
                                    const isInspected = inspecting === p.id;

                                    return (
                                        <tr key={p.id}
                                            className={`group transition-colors ${incomplete ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''} ${isInspected ? 'bg-sky-50/50 dark:bg-sky-950/10' : 'hover:bg-[hsl(var(--ui-surface-hover))]'}`}>
                                            <td className="px-4 py-3 max-w-[280px]">
                                                <div className="flex items-start gap-2">
                                                    {incomplete && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />}
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-[hsl(var(--ui-text))] truncate">{p.profileName}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[hsl(var(--ui-background))] text-[hsl(var(--ui-text-muted))]">
                                                                {family}
                                                            </span>
                                                            {p.source === 'SITE_SCRAPE' && (
                                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                                                                    scraper
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {zeroDims ? (
                                                    <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">— sem dimensões</span>
                                                ) : (
                                                    <span className="text-[hsl(var(--ui-text))]">{h} × {w} × {l}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {zeroWt ? (
                                                    <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">— sem peso</span>
                                                ) : (
                                                    <span className="text-[hsl(var(--ui-text))]">{wt} kg</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-[hsl(var(--ui-text-muted))]">
                                                    {PACKING_MODES.find(m => m.value === p.packingMode)?.label || p.packingMode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => handleToggle(p.id)}
                                                    className="text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                                    title={p.isActive ? 'Desativar' : 'Ativar'}>
                                                    {p.isActive
                                                        ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                                        : <ToggleLeft className="w-5 h-5" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <IconBtn icon={Eye} title="Inspecionar"
                                                        onClick={() => setInspecting(isInspected ? null : p.id)} />
                                                    <IconBtn icon={Pencil} title="Editar"
                                                        onClick={() => openEdit(p)} />
                                                    {(VALID_TRANSITIONS[p.reviewStatus] || []).map(next => (
                                                        <button key={next}
                                                            onClick={() => handleReviewStatus(p.id, next)}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${next === 'ACTIVE'
                                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                                                                : next === 'REVIEWED'
                                                                    ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:hover:bg-sky-900/50'
                                                                    : 'bg-[hsl(var(--ui-background))] text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface-hover))]'
                                                                }`}
                                                            title={`→ ${STATUS_CONFIG[next]?.label || next}`}>
                                                            {next === 'ACTIVE' ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                                            {STATUS_CONFIG[next]?.label || next}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-[hsl(var(--ui-border))] text-xs text-[hsl(var(--ui-text-muted))] flex items-center justify-between">
                        <span>{filteredProfiles.length} {filteredProfiles.length === 1 ? 'perfil' : 'perfis'}</span>
                        <span className="flex gap-3">
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {stats.draft} rascunhos</span>
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {stats.reviewed} revisados</span>
                            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {stats.active} ativos</span>
                        </span>
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
    const effectiveUnits = Math.min(qty, maxPerVolume);
    let packedH = h, packedW = w, packedL = l;

    switch (mode) {
        case 'STACK_VERTICAL': packedH = h + (effectiveUnits - 1) * hInc; break;
        case 'STACK_HORIZONTAL': packedW = w + (effectiveUnits - 1) * wInc; break;
        case 'NESTED': packedH = h + (effectiveUnits - 1) * hInc; break;
        case 'CUSTOM_RULE':
            packedH = h + (effectiveUnits - 1) * hInc;
            packedW = w + (effectiveUnits - 1) * wInc;
            packedL = l + (effectiveUnits - 1) * lInc;
            break;
    }

    const cubage = (packedH * packedW * packedL) / 1_000_000;
    return { h: packedH, w: packedW, l: packedL, weight: weight * qty, cubage: cubage * volumes, volumes };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuickPill({ children, active, onClick, badge, variant }: {
    children: React.ReactNode; active: boolean; onClick: () => void;
    badge?: number; variant?: 'warning';
}) {
    return (
        <button onClick={onClick}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${active
                ? variant === 'warning'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow-sm'
                    : 'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] shadow-sm'
                : 'text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface-hover))]'
                }`}>
            {children}
            {badge !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active
                    ? variant === 'warning'
                        ? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100'
                        : 'bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue))]'
                    : 'bg-[hsl(var(--ui-background))] text-[hsl(var(--ui-text-muted))]'
                    }`}>{badge}</span>
            )}
        </button>
    );
}

function MiniSelect({ value, onChange, options }: {
    value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-8 pl-2.5 pr-7 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-xs text-[hsl(var(--ui-text-muted))] appearance-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.2)] cursor-pointer">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-[hsl(var(--ui-text-muted))] pointer-events-none" />
        </div>
    );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'center' | 'right' }) {
    return (
        <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-background)/0.5)] ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}

function IconBtn({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
    return (
        <button onClick={onClick} title={title}
            className="p-1.5 rounded-md hover:bg-[hsl(var(--ui-surface-hover))] text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
            <Icon className="w-3.5 h-3.5" />
        </button>
    );
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-2.5">{title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
        </div>
    );
}

function FormInput({ label, value, onChange, type = 'text', warn }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; warn?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                step={type === 'number' ? '0.01' : undefined}
                className={`h-8 px-2.5 rounded-md border text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.2)] transition-colors ${warn
                    ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20'
                    : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]'
                    }`} />
        </div>
    );
}

function FormSelect({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-sm text-[hsl(var(--ui-text))] appearance-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.2)]">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function FormCheckbox({ label, checked, onChange }: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer h-8 mt-auto">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[hsl(var(--ui-border))] text-[hsl(var(--ui-accent-blue))] focus:ring-[hsl(var(--ui-accent-blue)/0.2)]" />
            <span className="text-sm text-[hsl(var(--ui-text))]">{label}</span>
        </label>
    );
}

function SimCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)]">
            <span className="text-[10px] font-medium text-[hsl(var(--ui-text-muted))]">{label}</span>
            <span className="text-sm font-semibold text-[hsl(var(--ui-text))] tabular-nums">{value}</span>
        </div>
    );
}
