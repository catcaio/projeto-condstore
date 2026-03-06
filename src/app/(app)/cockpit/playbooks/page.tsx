"use client";

import { useEffect, useState } from "react";
import { Brain, Power, Info, Network, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlaybookStep {
    action: string;
    delay_minutes: number;
}

interface SupremePlaybookRecord {
    id: string;
    playbookName: string;
    playbookDomain: string;
    triggerFindingType: string;
    actionSequence: PlaybookStep[];
    expectedMetric: string;
    successThreshold: number;
    isActive: boolean;
    createdAt: string;
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function SupremoPlaybooksPage() {
    const [playbooks, setPlaybooks] = useState<SupremePlaybookRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toggling, setToggling] = useState<string | null>(null);
    const [simulating, setSimulating] = useState<string | null>(null);

    async function getTenantId(): Promise<string> {
        const res = await fetch("/api/internal/me").catch(() => null);
        if (res?.ok) { const j = await res.json(); return j?.tenantId ?? "unknown"; }
        return "unknown";
    }

    async function loadPlaybooks() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/internal/playbooks");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setPlaybooks(json.data ?? []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    async function togglePlaybook(id: string) {
        setToggling(id);
        try {
            const res = await fetch(`/api/internal/playbooks/${id}/toggle`, { method: "POST" });
            if (!res.ok) throw new Error("Falha ao alterar status");
            await loadPlaybooks();
        } catch (err: any) { alert(err.message); }
        finally { setToggling(null); }
    }

    async function simulatePlaybook(id: string) {
        setSimulating(id);
        try {
            const tenantId = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tenantId}/playbooks/${id}/simulate`, { method: "POST" });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.message ?? "Erro na simulacao");
            }
            alert("Simulação concluída com sucesso! Visualizar fila de ações.");
            window.location.href = '/cockpit/actions';
        } catch (err: any) {
            if (err.message.includes('needs at least one finding')) {
                alert("Atenção: Para simular a ligação de um playbook para gerar uma Action neste tenant, ele precisa ter ao menos 1 Finding aberto. Rode o Analisador Supremo primeiro no Cockpit Supremo.");
            } else {
                alert(`Erro: ${err.message}`);
            }
        }
        finally { setSimulating(null); }
    }

    useEffect(() => { loadPlaybooks(); }, []);

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">
                &larr; Cockpit
            </Link>
        </div>
    );

    return (
        <SettingsPage
            title="Playbooks de Recuperação"
            description="Gerencie as ações contínuas da inteligência artificial. Playbooks são estratégias que o Supremo aciona quando métricas saem do controle."
            headerAction={headerAction}
        >
            {loading && <div className="text-sm text-[hsl(var(--ui-text-muted))] animate-pulse">Carregando motores táticos...</div>}
            {error && <div className="text-red-500 text-sm">Erro: {error}</div>}

            {!loading && !error && (
                <SettingsSection title={`Engine Rules (${playbooks.length})`}>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {playbooks.map(pb => (
                            <Card key={pb.id} className="p-4 flex flex-col justify-between border-t-2 border-t-[hsl(var(--ui-border))]">

                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                                            {pb.playbookDomain}
                                        </span>
                                        <Badge variant={pb.isActive ? "success" : "muted"}>
                                            {pb.isActive ? "ATIVO" : "INATIVO"}
                                        </Badge>
                                    </div>

                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-indigo-500" />
                                        {pb.playbookName}
                                    </h3>
                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] font-mono mb-3 bg-[hsl(var(--ui-bg-subtle))] p-1.5 rounded truncate">
                                        Trigger: <span className="text-[hsl(var(--ui-text))]">{pb.triggerFindingType}</span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-[hsl(var(--ui-text-muted))] mb-1.5 flex items-center gap-1">
                                            <Network className="w-3 h-3" /> Sequência de Ação Automática
                                        </div>
                                        <div className="space-y-1.5 border-l-2 border-indigo-500/30 pl-3">
                                            {pb.actionSequence.map((step, idx) => (
                                                <div key={idx} className="bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded p-2 flex items-center justify-between">
                                                    <span className="text-[11px] font-mono font-medium text-[hsl(var(--ui-text))]">
                                                        {idx + 1}. {step.action}
                                                    </span>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-muted))] flex items-center gap-1">
                                                        {step.delay_minutes > 0 ? `T+${step.delay_minutes}m` : 'Imediato'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                                        <div>
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] mb-0.5 uppercase tracking-wide">Métrica de Sucesso</div>
                                            <div className="text-[11px] font-mono font-medium">{pb.expectedMetric}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-[hsl(var(--ui-text-muted))] mb-0.5 uppercase tracking-wide">Alvo Recuperação</div>
                                            <div className="text-[11px] font-mono font-medium flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="w-3 h-3" /> &gt; {pb.successThreshold.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-[hsl(var(--ui-border))]">
                                        <button
                                            disabled={toggling === pb.id}
                                            onClick={() => togglePlaybook(pb.id)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded font-medium disabled:opacity-50 transition-colors ${pb.isActive ? 'bg-[hsl(var(--ui-bg-subtle))] hover:bg-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                        >
                                            <Power className="w-3.5 h-3.5" />
                                            {pb.isActive ? 'Desativar Automação' : 'Ativar Playbook'}
                                        </button>
                                        <button
                                            disabled={simulating === pb.id}
                                            onClick={() => simulatePlaybook(pb.id)}
                                            title="Força este playbook a rodar num finding falso para gerar as Ações no Cockpit"
                                            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 border border-[hsl(var(--ui-border))] bg-zinc-900 text-white rounded font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                                        >
                                            <Zap className="w-3.5 h-3.5" /> Smular
                                        </button>
                                    </div>

                                </div>
                            </Card>
                        ))}
                    </div>
                </SettingsSection>
            )}
        </SettingsPage>
    );
}
