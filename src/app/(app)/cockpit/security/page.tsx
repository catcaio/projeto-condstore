"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Activity, Key, Globe, Ban, Skull, ShieldCheck, AlertTriangle } from "lucide-react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";

interface ActiveIncident {
    id: string;
    reason: string;
    count: number;
    route: string | null;
    ip_hash: string | null;
    window_start: string;
    window_end: string;
    created_at: string;
}

interface SecurityMetrics {
    total_events: number;
    events_by_type: Record<string, number>;
    top_ip_hash: { ip_hash: string; count: number }[];
    top_routes: { route: string; count: number }[];
    incidents: {
        timestamp: string;
        route: string;
        reason: string;
        ip_hash: string;
        tenant_claim: string;
    }[];
    events_last_24h: { timestamp: string; count: number }[];
    active_incidents: ActiveIncident[];
}

export default function SecurityCockpitPage() {
    const [data, setData] = useState<SecurityMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/internal/security/events");
            if (!res.ok) throw new Error("Failed to load security metrics");
            const json = await res.json();
            if (json.ok && json.data) {
                setData(json.data);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, []);

    if (loading && !data) {
        return (
            <SettingsPage
                title="Security Cockpit"
                description="Monitoramento de eventos de segurança em tempo real"
                headerAction={<Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">&larr; Voltar ao Launcher</Link>}
            >
                <div>Carregando métricas de segurança...</div>
            </SettingsPage>
        );
    }

    if (error) {
        return (
            <SettingsPage
                title="Security Cockpit"
                description="Monitoramento de eventos de segurança em tempo real"
                headerAction={<Link href="/cockpit" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">&larr; Voltar ao Launcher</Link>}
            >
                <div className="text-red-500">Erro: {error}</div>
            </SettingsPage>
        );
    }

    if (!data) return null;

    const blockedRequests24h = data.events_last_24h.reduce((acc, curr) => acc + curr.count, 0);
    const getCount = (reasonType: string) => data.events_by_type[reasonType] || 0;
    const maxChartValue = Math.max(...data.events_last_24h.map(d => d.count), 1);
    const hasActiveIncidents = data.active_incidents && data.active_incidents.length > 0;

    return (
        <SettingsPage
            title="Security Cockpit"
            description="Monitoramento de eventos de segurança (Edge Security Events)"
            headerAction={<button onClick={loadData} className="text-xs px-3 py-1 bg-[hsl(var(--ui-accent-blue))] text-white rounded font-medium hover:opacity-90">Atualizar</button>}
        >
            {/* Header status */}
            <div className="flex items-center gap-3 mb-6">
                {hasActiveIncidents ? (
                    <Badge variant="danger" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {data.active_incidents.length} Anomalia(s) Ativa(s)
                    </Badge>
                ) : (
                    <Badge variant="success" className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Monitoramento Ativo
                    </Badge>
                )}
                <span className="text-sm text-[hsl(var(--ui-text-muted))]">Total de eventos (histórico): {data.total_events}</span>
            </div>

            {/* ACTIVE ANOMALY INCIDENTS - shown prominently when there are active incidents */}
            {hasActiveIncidents && (
                <SettingsSection title="🚨 Incidentes de Anomalia Detectados">
                    <div className="border border-red-500/30 rounded overflow-hidden bg-red-500/5 mb-6">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-red-500/10 border-b border-red-500/20">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Detectado em</th>
                                    <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Motivo</th>
                                    <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Contagem</th>
                                    <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Rota</th>
                                    <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Janela</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-500/10">
                                {data.active_incidents.map(inc => (
                                    <tr key={inc.id} className="hover:bg-red-500/10 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs">{new Date(inc.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3"><Badge variant="danger">{inc.reason}</Badge></td>
                                        <td className="px-4 py-3 font-bold text-red-500">{inc.count}</td>
                                        <td className="px-4 py-3 font-mono text-xs max-w-[160px] truncate">{inc.route || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--ui-text-muted))]">
                                            {new Date(inc.window_start).toLocaleTimeString()} – {new Date(inc.window_end).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SettingsSection>
            )}

            {/* METRIC WIDGETS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <MetricCard title="Blocked Requests (24h)" value={blockedRequests24h} icon={<Ban className="w-4 h-4 text-red-500" />} />
                <MetricCard title="Public Kill Switch" value={getCount('public_kill_switch_triggered')} icon={<Skull className="w-4 h-4 text-orange-500" />} />
                <MetricCard title="Rate Limit Events" value={getCount('rate_limit_exceeded')} icon={<Activity className="w-4 h-4 text-blue-500" />} />
                <MetricCard title="Tenant Mismatch" value={getCount('tenant_mismatch')} icon={<Globe className="w-4 h-4 text-purple-500" />} />
                <MetricCard title="Invalid JWT" value={getCount('invalid_jwt')} icon={<Key className="w-4 h-4 text-yellow-500" />} />
                <MetricCard title="Header Spoof Attempts" value={getCount('header_spoofing')} icon={<ShieldAlert className="w-4 h-4 text-red-600" />} />
            </div>

            {/* TEMPORAL CHART */}
            <SettingsSection title="Picos de Bloqueio (Últimas 24h, buckets de 5 min)">
                <Card className="p-4 h-48 flex items-end gap-1 overflow-hidden relative border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
                    {data.events_last_24h.length === 0 ? (
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] absolute inset-0 flex items-center justify-center">Nenhum evento nas últimas 24h.</div>
                    ) : (
                        data.events_last_24h.map((bucket, idx) => {
                            const heightPct = Math.max((bucket.count / maxChartValue) * 100, 2);
                            return (
                                <div
                                    key={idx}
                                    title={`${new Date(bucket.timestamp).toLocaleTimeString()}: ${bucket.count} events`}
                                    className="flex-1 bg-red-500 opacity-80 hover:opacity-100 rounded-t-sm transition-all"
                                    style={{ height: `${heightPct}%`, minWidth: '4px' }}
                                />
                            );
                        })
                    )}
                </Card>
            </SettingsSection>

            {/* TOP ROUTES & IPs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <SettingsSection title="Top Rotas Atacadas (24h)">
                    {data.top_routes.length > 0 ? (
                        <ul className="text-sm border border-[hsl(var(--ui-border))] rounded divide-y divide-[hsl(var(--ui-border))]">
                            {data.top_routes.map(r => (
                                <li key={r.route} className="flex justify-between p-3 bg-[hsl(var(--ui-bg))]">
                                    <span className="font-mono text-xs">{r.route}</span>
                                    <span className="font-medium text-red-500">{r.count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Sem dados.</p>}
                </SettingsSection>
                <SettingsSection title="Top Origens (IP Hash)">
                    {data.top_ip_hash.length > 0 ? (
                        <ul className="text-sm border border-[hsl(var(--ui-border))] rounded divide-y divide-[hsl(var(--ui-border))]">
                            {data.top_ip_hash.map(r => (
                                <li key={r.ip_hash} className="flex justify-between p-3 bg-[hsl(var(--ui-bg))]">
                                    <span className="font-mono text-xs truncate max-w-[200px]" title={r.ip_hash}>{r.ip_hash || 'Desconhecido'}</span>
                                    <span className="font-medium text-red-500">{r.count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-[hsl(var(--ui-text-muted))]">Sem dados.</p>}
                </SettingsSection>
            </div>

            {/* RAW INCIDENTS TABLE */}
            <SettingsSection title="Últimos Eventos de Segurança">
                <div className="border border-[hsl(var(--ui-border))] rounded overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[hsl(var(--ui-bg-subtle))] border-b border-[hsl(var(--ui-border))]">
                            <tr>
                                <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Timestamp</th>
                                <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Motivo</th>
                                <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Rota</th>
                                <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Tenant</th>
                                <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">IP Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                            {data.incidents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--ui-text-muted))]">Sem incidentes recentes.</td>
                                </tr>
                            )}
                            {data.incidents.map((inc, i) => (
                                <tr key={i} className="hover:bg-[hsl(var(--ui-bg-subtle))] transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs">{new Date(inc.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-3"><Badge variant="danger">{inc.reason}</Badge></td>
                                    <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={inc.route}>{inc.route}</td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--ui-text-muted))] truncate max-w-[120px]">{inc.tenant_claim || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--ui-text-muted))] truncate max-w-[100px]">{inc.ip_hash || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsSection>

        </SettingsPage>
    );
}

function MetricCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <Card className="p-4 flex flex-col justify-between h-24 border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-border-hover))] transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">{title}</span>
                {icon}
            </div>
            <span className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</span>
        </Card>
    );
}
