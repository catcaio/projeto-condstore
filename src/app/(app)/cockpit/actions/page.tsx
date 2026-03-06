"use client";

import { useEffect, useState } from "react";
import { Play, ThumbsUp, ThumbsDown, RefreshCcw, ChevronDown, AlertCircle, CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionRecord {
    id: string;
    tenantId: string;
    actionType: string;
    actionScope: string;
    status: string;
    proposedBy: string;
    approvedBy?: string;
    executedBy?: string;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
    createdAt: string;
    approvedAt?: string;
    executedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'default' | 'muted' | 'success' | 'danger' | 'outline'> = {
    PROPOSED: 'default',
    APPROVED: 'success',
    REJECTED: 'danger',
    EXECUTED: 'success',
    FAILED: 'danger',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    PROPOSED: <Clock className="w-3 h-3" />,
    APPROVED: <CheckCircle2 className="w-3 h-3" />,
    REJECTED: <XCircle className="w-3 h-3" />,
    EXECUTED: <Zap className="w-3 h-3" />,
    FAILED: <AlertCircle className="w-3 h-3" />,
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActionsCockpitPage() {
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterScope, setFilterScope] = useState("");
    const [working, setWorking] = useState<string | null>(null);

    async function getTenantId(): Promise<string> {
        const res = await fetch("/api/internal/me").catch(() => null);
        if (res?.ok) { const j = await res.json(); return j?.tenantId ?? "unknown"; }
        return "unknown";
    }

    async function loadActions() {
        setLoading(true);
        setError("");
        try {
            const tenantId = await getTenantId();
            const qs = new URLSearchParams();
            if (filterStatus) qs.set("status", filterStatus);
            if (filterScope) qs.set("scope", filterScope);
            qs.set("limit", "100");
            const res = await fetch(`/api/internal/tenants/${tenantId}/actions?${qs.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setActions(json.data ?? []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    async function doAction(actionId: string, verb: 'approve' | 'reject' | 'execute') {
        setWorking(actionId + verb);
        try {
            const tenantId = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tenantId}/actions/${actionId}/${verb}`, { method: 'POST' });
            if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `HTTP ${res.status}`); }
            await loadActions();
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setWorking(null); }
    }

    useEffect(() => { loadActions(); }, [filterStatus, filterScope]); // eslint-disable-line react-hooks/exhaustive-deps

    const statuses = ['', 'PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'];
    const scopes = ['', 'ADS', 'CRM', 'WHATSAPP', 'FREIGHT', 'PRICING'];

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">
                &larr; Cockpit
            </Link>
            <button onClick={loadActions} className="flex items-center gap-1 text-xs px-3 py-1 bg-[hsl(var(--ui-accent-blue))] text-white rounded font-medium hover:opacity-90">
                <RefreshCcw className="w-3 h-3" /> Atualizar
            </button>
        </div>
    );

    // Group by status
    const grouped: Record<string, ActionRecord[]> = {};
    for (const a of actions) {
        if (!grouped[a.status]) grouped[a.status] = [];
        grouped[a.status].push(a);
    }

    const sections: Array<{ key: string; label: string }> = [
        { key: 'PROPOSED', label: '⏳ Propostas Pendentes' },
        { key: 'APPROVED', label: '✅ Aprovadas' },
        { key: 'EXECUTED', label: '⚡ Executadas' },
        { key: 'FAILED', label: '❌ Falhas' },
        { key: 'REJECTED', label: '🚫 Rejeitadas' },
    ];

    return (
        <SettingsPage
            title="Action Engine"
            description="Lifecycle governado de ações tenant-level: propor → aprovar → executar"
            headerAction={headerAction}
        >
            {/* Filters */}
            <div className="flex gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                    <ChevronDown className="w-3 h-3 text-[hsl(var(--ui-text-muted))]" />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded px-2 py-1"
                    >
                        {statuses.map(s => <option key={s} value={s}>{s || 'Todos os Status'}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <ChevronDown className="w-3 h-3 text-[hsl(var(--ui-text-muted))]" />
                    <select
                        value={filterScope}
                        onChange={e => setFilterScope(e.target.value)}
                        className="text-xs bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded px-2 py-1"
                    >
                        {scopes.map(s => <option key={s} value={s}>{s || 'Todos os Escopos'}</option>)}
                    </select>
                </div>
            </div>

            {loading && <div className="text-sm text-[hsl(var(--ui-text-muted))] animate-pulse">Carregando ações...</div>}
            {error && <div className="text-red-500 text-sm">Erro: {error}</div>}

            {!loading && !error && actions.length === 0 && (
                <Card className="p-8 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                    Nenhuma ação encontrada para os filtros aplicados.
                </Card>
            )}

            {sections.map(({ key, label }) => {
                const list = grouped[key];
                if (!list?.length) return null;
                return (
                    <SettingsSection key={key} title={`${label} (${list.length})`}>
                        <div className="border border-[hsl(var(--ui-border))] rounded overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[hsl(var(--ui-bg-subtle))] border-b border-[hsl(var(--ui-border))]">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Tipo</th>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Escopo</th>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Status</th>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Proposto por</th>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Criado</th>
                                        <th className="px-4 py-2 text-xs font-medium text-[hsl(var(--ui-text-muted))]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                                    {list.map(action => (
                                        <tr key={action.id} className="hover:bg-[hsl(var(--ui-bg-subtle))] transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{action.actionType}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline">{action.actionScope}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={STATUS_VARIANT[action.status] ?? 'muted'} className="flex items-center gap-1 w-fit">
                                                    {STATUS_ICON[action.status]}
                                                    {action.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--ui-text-muted))]">{action.proposedBy}</td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--ui-text-muted))]">
                                                {new Date(action.createdAt).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {action.status === 'PROPOSED' && (
                                                        <>
                                                            <button
                                                                disabled={!!working}
                                                                onClick={() => doAction(action.id, 'approve')}
                                                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-600/10 text-green-500 hover:bg-green-600/20 disabled:opacity-50"
                                                            >
                                                                <ThumbsUp className="w-3 h-3" /> Aprovar
                                                            </button>
                                                            <button
                                                                disabled={!!working}
                                                                onClick={() => doAction(action.id, 'reject')}
                                                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-600/10 text-red-500 hover:bg-red-600/20 disabled:opacity-50"
                                                            >
                                                                <ThumbsDown className="w-3 h-3" /> Rejeitar
                                                            </button>
                                                        </>
                                                    )}
                                                    {action.status === 'APPROVED' && (
                                                        <button
                                                            disabled={!!working}
                                                            onClick={() => doAction(action.id, 'execute')}
                                                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 disabled:opacity-50"
                                                        >
                                                            <Play className="w-3 h-3" /> Executar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SettingsSection>
                );
            })}
        </SettingsPage>
    );
}
