"use client";

import { useEffect, useState } from "react";
import { Brain, Search, Play, CheckCircle2, AlertTriangle, AlertCircle, Info, ChevronDown } from "lucide-react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FindingRecord {
    id: string;
    tenantId: string;
    findingType: string;
    findingDomain: string;
    severity: string;
    title: string;
    summary: string;
    evidence: Record<string, unknown>;
    recommendedActionType?: string;
    recommendedActionPayload?: Record<string, unknown>;
    status: string;
    createdAt: string;
    resolvedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const STATUS_BADGE: Record<string, 'default' | 'muted' | 'success' | 'danger'> = {
    OPEN: 'danger',
    ACTION_PROPOSED: 'default',
    RESOLVED: 'success',
    DISMISSED: 'muted',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupremoCockpitPage() {
    const [findings, setFindings] = useState<FindingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterStatus, setFilterStatus] = useState("OPEN");
    const [working, setWorking] = useState<string | null>(null);

    async function getTenantId(): Promise<string> {
        const res = await fetch("/api/internal/me").catch(() => null);
        if (res?.ok) { const j = await res.json(); return j?.tenantId ?? "unknown"; }
        return "unknown";
    }

    async function loadFindings() {
        setLoading(true);
        setError("");
        try {
            const tenantId = await getTenantId();
            const qs = new URLSearchParams();
            if (filterStatus) qs.set("status", filterStatus);
            qs.set("limit", "100");
            const res = await fetch(`/api/internal/tenants/${tenantId}/supreme/findings?${qs.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setFindings(json.data ?? []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    async function triggerAnalysis() {
        setWorking('analyzing');
        try {
            const tenantId = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tenantId}/supreme/analyze`, { method: 'POST' });
            if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `HTTP ${res.status}`); }
            const j = await res.json();
            alert(`Análise concluída. ${j.data.findingsGenerated} novos findings encontrados.`);
            await loadFindings();
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setWorking(null); }
    }

    async function resolveFinding(findingId: string) {
        setWorking(findingId + 'resolve');
        try {
            const tenantId = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tenantId}/supreme/findings/${findingId}/resolve`, { method: 'POST' });
            if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `HTTP ${res.status}`); }
            await loadFindings();
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setWorking(null); }
    }

    async function proposeAction(findingId: string) {
        setWorking(findingId + 'propose');
        try {
            const tenantId = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tenantId}/supreme/findings/${findingId}/propose-action`, { method: 'POST' });
            if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `HTTP ${res.status}`); }
            const j = await res.json();
            alert(`Ação proposta com sucesso! Redirecionando para aprovação...`);
            window.location.href = '/cockpit/actions';
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setWorking(null); }
    }

    useEffect(() => { loadFindings(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">
                &larr; Cockpit
            </Link>
            <button
                disabled={!!working}
                onClick={triggerAnalysis}
                className={`flex items-center gap-1 text-xs px-3 py-1 text-white rounded font-medium disabled:opacity-50 transition-opacity ${working === 'analyzing' ? 'bg-indigo-600/50 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                <Brain className="w-3 h-3" /> {working === 'analyzing' ? 'Avaliando...' : 'Rodar Análise Supremo'}
            </button>
        </div>
    );

    return (
        <SettingsPage
            title="FRANK SUPREMO"
            description="Inteligência autônoma que identifica gargalos transacionais, propõe ações e atua para reverter perdas (Recuperação Inteligente)."
            headerAction={headerAction}
        >
            <div className="flex gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <ChevronDown className="w-3 h-3 text-[hsl(var(--ui-text-muted))]" />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded px-2 py-1"
                    >
                        <option value="">Todos os Status</option>
                        <option value="OPEN">🚨 Abertos (Em Atenção)</option>
                        <option value="ACTION_PROPOSED">⏳ Ação Proposta</option>
                        <option value="RESOLVED">✅ Resolvidos</option>
                        <option value="DISMISSED">🚫 Ignorados</option>
                    </select>
                </div>
            </div>

            {loading && <div className="text-sm text-[hsl(var(--ui-text-muted))] animate-pulse">Carregando insights...</div>}
            {error && <div className="text-red-500 text-sm">Erro: {error}</div>}

            {!loading && !error && findings.length === 0 && (
                <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
                    <Brain className="w-12 h-12 text-[hsl(var(--ui-border-strong))] mb-4 opacity-50" />
                    <h3 className="text-sm font-medium mb-1">Nenhum Finding no momento</h3>
                    <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-4 max-w-sm">
                        Tudo indica que as métricas deste tenant estão dentro da normalidade (ou o analisador não encontrou quebras severas de funil).
                    </p>
                    <button
                        onClick={triggerAnalysis}
                        className="text-xs px-3 py-1.5 bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded hover:bg-[hsl(var(--ui-border))] transition-colors"
                    >
                        Forçar Análise Agora
                    </button>
                </Card>
            )}

            {!loading && !error && findings.length > 0 && (
                <SettingsSection title={`Insights e Recomendações (${findings.length})`}>
                    <div className="space-y-4">
                        {findings.map(finding => (
                            <Card key={finding.id} className="p-4 flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${SEVERITY_COLOR[finding.severity] || SEVERITY_COLOR.LOW}`}>
                                            {finding.severity}
                                        </span>
                                        <Badge variant={STATUS_BADGE[finding.status] || 'muted'}>{finding.status}</Badge>
                                        <span className="text-[10px] uppercase tracking-wider font-medium text-[hsl(var(--ui-text-muted))]">
                                            {finding.findingDomain}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                                        {finding.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Info className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />}
                                        {finding.title}
                                    </h3>

                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-3 leading-relaxed">
                                        {finding.summary}
                                    </p>

                                    <div className="bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] p-2 rounded text-[10px] font-mono whitespace-pre-wrap text-[hsl(var(--ui-text-muted))] overflow-x-auto">
                                        Evidência: {JSON.stringify(finding.evidence)}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 min-w-[200px] border-l border-[hsl(var(--ui-border))] pl-4 justify-center">
                                    {finding.recommendedActionType && finding.status === 'OPEN' ? (
                                        <>
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] font-medium uppercase tracking-wider mb-1">
                                                Ação Recomendada
                                            </div>
                                            <div className="text-xs font-mono bg-indigo-500/10 text-indigo-500 p-1.5 rounded mb-2 break-all text-center">
                                                {finding.recommendedActionType}
                                            </div>

                                            <button
                                                disabled={!!working}
                                                onClick={() => proposeAction(finding.id)}
                                                className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                            >
                                                <Play className="w-3.5 h-3.5" /> Aprovar e Propor
                                            </button>
                                            <button
                                                disabled={!!working}
                                                onClick={() => resolveFinding(finding.id)}
                                                className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-text-muted))] rounded hover:bg-[hsl(var(--ui-border))] disabled:opacity-50 transition-colors"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Resolvido
                                            </button>
                                        </>
                                    ) : finding.status === 'ACTION_PROPOSED' ? (
                                        <div className="text-center">
                                            <div className="text-xs font-medium text-[hsl(var(--ui-text-muted))] mb-2">Ação em avaliação (Action Engine)</div>
                                            <Link href="/cockpit/actions" className="text-xs text-[hsl(var(--ui-accent-blue))] hover:underline inline-flex items-center gap-1">
                                                Ver fila de Ações &rarr;
                                            </Link>
                                        </div>
                                    ) : finding.status === 'OPEN' ? (
                                        <div className="text-center h-full items-center flex flex-col justify-center">
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] mb-2">Sem recomendação de automação para este caso.</div>
                                            <button
                                                disabled={!!working}
                                                onClick={() => resolveFinding(finding.id)}
                                                className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-[hsl(var(--ui-bg-subtle))] text-[hsl(var(--ui-text-muted))] rounded hover:bg-[hsl(var(--ui-border))] disabled:opacity-50 transition-colors"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center h-full items-center flex flex-col justify-center text-xs text-[hsl(var(--ui-text-muted))]">
                                            Encerrado em {new Date((finding as any).resolvedAt || finding.createdAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </SettingsSection>
            )}
        </SettingsPage>
    );
}
