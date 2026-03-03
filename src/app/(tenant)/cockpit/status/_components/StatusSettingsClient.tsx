'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { runGoNoGoChecks, toggleIncidentMode, toggleOutbound, runProcessorNow } from './actions';
import { ConciergeStatusCard } from './ConciergeStatusCard';

interface GoNoGoResults {
    internalTokenValid: boolean;
    dbOk: boolean;
    redisOk: boolean;
    secretsVerified: boolean;
    incidentOff: boolean;
    passed: boolean;
}

interface CircuitBreakerStatus {
    tenantId: string;
    provider: string;
    failures: number;
    openedAt: string;
}

interface RateLimiterFallback {
    count: number;
    lastSeenAt: number | null;
}

interface HealthSummary {
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    db: 'ok' | 'fail';
    redis: 'ok' | 'fail';
    rateLimiterFallback: RateLimiterFallback;
    circuitBreakers: CircuitBreakerStatus[];
    outboundEnabled: boolean;
    incidentMode: boolean;
    unverifiedSecrets: string[];
    domineMetrics: {
        dlqDepth: number;
        oldestEventAgeMs: number;
        processorStalled: boolean;
    };
    privacyMetrics: {
        totalBlocked: number;
    };
}

export function StatusSettingsClient({ tenantId }: { tenantId: string }) {
    const [stats, setStats] = useState<HealthSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [goNoGoLoading, setGoNoGoLoading] = useState(false);
    const [goNoGoResult, setGoNoGoResult] = useState<GoNoGoResults | null>(null);

    const [isPending, startTransition] = useTransition();

    const [domineEvents, setDomineEvents] = useState<any[]>([]);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/health`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setLastUpdated(new Date());
            }

            const eventsRes = await fetch(`/api/cockpit/audit?limit=25`);
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                const relevantTypes = ['PROCESSOR_FAILURE', 'PRIVACY_ACTION', 'INCIDENT_TRIGGERED', 'MANUAL_PURGE', 'TOGGLE_OUTBOUND', 'TOGGLE_INCIDENT'];
                const filtered = (data.events || []).filter((e: any) =>
                    relevantTypes.includes(e.type) ||
                    e.payload?.status === 'failure' ||
                    e.type.includes('PURGE') ||
                    e.type.includes('REVOKE')
                ).slice(0, 5);
                setDomineEvents(filtered);
            }
        } catch (e) {
            console.error('Failed to load status');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleRunChecks = async () => {
        setGoNoGoLoading(true);
        setGoNoGoResult(null);
        try {
            const result = await runGoNoGoChecks(tenantId);
            setGoNoGoResult(result);
        } catch (e) {
            alert('Falha interna ao rodar Go/No-Go Check');
        } finally {
            setGoNoGoLoading(false);
        }
    };

    if (!stats) {
        return <div className="text-zinc-400 p-8 border border-zinc-800 rounded-xl bg-zinc-900/50">Carregando telemetria base...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Telemetria Operacional Atualizada em {lastUpdated?.toLocaleTimeString()}
                </p>
                <button
                    onClick={() => fetchStatus()}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-medium text-black bg-white/90 hover:bg-white rounded transition shadow disabled:opacity-50"
                >
                    {loading ? 'Sincronizando...' : 'Recarregar Painel'}
                </button>
            </div>

            {/* [ DECISION CENTER / ALERT INTELLIGENCE ] */}
            {(() => {
                const health = stats.systemHealth || 'HEALTHY';

                const alerts = [];
                if (health === 'CRITICAL' || stats.incidentMode) {
                    alerts.push({
                        id: 'critical-incident',
                        message: 'Critical Failure detected. Immediate investigation required.',
                        actionLabel: 'Investigate Now',
                        actionFn: () => { /* Future link to incident dashboard */ }
                    });
                }

                if (stats.domineMetrics.processorStalled) {
                    alerts.push({
                        id: 'processor-stalled',
                        message: 'Event processor appears to be stalled.',
                        actionLabel: 'Run Processor',
                        actionFn: () => runProcessorNow(tenantId)
                    });
                } else if (stats.domineMetrics.oldestEventAgeMs > 600000) { // 10 min
                    alerts.push({
                        id: 'queue-delayed',
                        message: 'Events are queueing up beyond acceptable SLA.',
                        actionLabel: 'Run Processor',
                        actionFn: () => runProcessorNow(tenantId)
                    });
                }

                if (stats.domineMetrics.dlqDepth > 5) {
                    alerts.push({
                        id: 'high-dlq',
                        message: 'High volume of failed events in Dead Letter Queue.',
                        actionLabel: 'Review Queue',
                        actionHref: '/cockpit/domine/dlq'
                    });
                }

                if (alerts.length === 0) {
                    return (
                        <div className="p-8 rounded-2xl border bg-emerald-950/20 border-emerald-900/50 flex flex-col items-center justify-center gap-2 text-emerald-400">
                            <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">System Health</h2>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                <div className="text-2xl font-black tracking-tight">System Stable</div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="rounded-2xl border bg-zinc-900 border-red-900/50 overflow-hidden">
                        <div className="bg-red-950/40 px-5 py-3 border-b border-red-900/50 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-red-400">Attention Required</h2>
                        </div>
                        <div className="divide-y divide-zinc-800">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <span className="text-lg">⚠️</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-200">{alert.message}</p>
                                        </div>
                                    </div>
                                    <div>
                                        {alert.actionHref ? (
                                            <Link href={alert.actionHref} className="whitespace-nowrap px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition inline-block">
                                                {alert.actionLabel}
                                            </Link>
                                        ) : (
                                            <button
                                                disabled={isPending}
                                                onClick={() => {
                                                    startTransition(async () => {
                                                        if (alert.actionFn) {
                                                            await alert.actionFn();
                                                            fetchStatus();
                                                        }
                                                    });
                                                }}
                                                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${health === 'CRITICAL' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                                            >
                                                {alert.actionLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* [ INCIDENT + OUTBOUND + PROCESSOR ] */}
                <div className="p-5 rounded-2xl border bg-zinc-900 border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">System Triggers</h3>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400 font-medium">Incident Mode</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${stats.incidentMode ? 'text-red-500 bg-red-950/50 px-2 py-0.5 rounded' : 'text-zinc-500'}`}>
                                {stats.incidentMode ? 'ACTIVE' : 'IDLE'}
                            </span>
                            <button
                                disabled={isPending}
                                onClick={() => startTransition(async () => {
                                    await toggleIncidentMode(tenantId, stats.incidentMode);
                                    fetchStatus();
                                })}
                                className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50"
                            >
                                Toggle
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400 font-medium">Outbound Traffic</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${stats.outboundEnabled ? 'text-emerald-400' : 'text-red-500 bg-red-950/50 px-2 py-0.5 rounded'}`}>
                                {stats.outboundEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                            <button
                                disabled={isPending}
                                onClick={() => startTransition(async () => {
                                    await toggleOutbound(tenantId, stats.outboundEnabled);
                                    fetchStatus();
                                })}
                                className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50"
                            >
                                Toggle
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400 font-medium">Processor</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${stats.domineMetrics.processorStalled ? 'text-red-500 bg-red-950/50 px-2 py-0.5 rounded' : 'text-emerald-400'}`}>
                                {stats.domineMetrics.processorStalled ? 'STALLED' : 'RUNNING'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* [ DLQ + EVENT AGE + LGPD BLOCKS ] */}
                <div className="p-5 rounded-2xl border bg-zinc-900 border-zinc-800 space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Telemetry</h3>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-zinc-400 font-medium">DLQ Depth</span>
                            <span className={`text-lg font-black ${stats.domineMetrics.dlqDepth > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {stats.domineMetrics.dlqDepth}
                            </span>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-zinc-400 font-medium">Oldest Pending Event</span>
                            <span className={`text-lg font-black ${stats.domineMetrics.oldestEventAgeMs > 300000 ? 'text-amber-500' : 'text-emerald-400'}`}>
                                {stats.domineMetrics.oldestEventAgeMs > 0 ? `${Math.floor(stats.domineMetrics.oldestEventAgeMs / 60000)}m` : '0m'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400 font-medium">LGPD Blocked Attempts (24h)</span>
                            <span className={`text-lg font-black ${stats.privacyMetrics.totalBlocked > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                                {stats.privacyMetrics.totalBlocked}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Concierge Status */}
            <ConciergeStatusCard />

            {/* [ Últimos 5 eventos relevantes ] */}
            <div className="p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Últimos Eventos Relevantes</h3>
                {domineEvents.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-4 text-center">Sistema operando normalmente. Nenhum evento crítico recente.</div>
                ) : (
                    <div className="space-y-2">
                        {domineEvents.map((evt: any) => (
                            <div key={evt.id} className="p-3 bg-black/40 border border-zinc-800/80 rounded flex justify-between items-center">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-mono text-zinc-400">{new Date(evt.createdAt).toLocaleString()}</span>
                                    <span className="text-sm font-bold text-zinc-200">{evt.type}</span>
                                    {evt.payload?.resource && <span className="text-xs text-zinc-500">{evt.payload.resource}</span>}
                                </div>
                                <div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded ${evt.payload?.status === 'failure' || evt.type.includes('FAILURE') ? 'bg-red-950/40 text-red-500 border border-red-900/50' : 'bg-amber-950/40 text-amber-500 border border-amber-900/50'}`}>
                                        {evt.payload?.status || 'TRIGGERED'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-wrap gap-2">
                <Link href={`/cockpit/settings/security`} className="px-4 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition">Ver Segredos/Security</Link>
                <Link href={`/cockpit/status/audit`} className="px-4 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition">Audit Log & Incidentes</Link>
                <Link href={`/cockpit/settings/knowledge`} className="px-4 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition">Knowledge Base</Link>
            </div>

            {/* Go/No-Go Checks Box */}
            <div className="p-5 rounded-2xl border bg-zinc-950 border-zinc-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4 mb-4">
                    <div>
                        <h3 className="text-base text-zinc-100 font-bold flex items-center gap-2">
                            <span>Testes de Go/No-Go (Smoke Prod)</span>
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">Validação do ambiente de staging/produção para o Tenant.</p>
                    </div>
                    <button
                        onClick={handleRunChecks}
                        disabled={goNoGoLoading}
                        className="px-4 py-2 font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow disabled:opacity-50 min-w-[150px]"
                    >
                        {goNoGoLoading ? 'Testando...' : 'Rodar Testes'}
                    </button>
                </div>

                {goNoGoResult && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className={`p-3 rounded border text-sm flex justify-between items-center ${goNoGoResult.internalTokenValid ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-red-950/20 border-red-900/50 text-red-500'}`}>
                            <span>Internal Token</span>
                            <strong>{goNoGoResult.internalTokenValid ? 'PASS' : 'FAIL'}</strong>
                        </div>
                        <div className={`p-3 rounded border text-sm flex justify-between items-center ${goNoGoResult.dbOk ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-red-950/20 border-red-900/50 text-red-500'}`}>
                            <span>Banco de Dados</span>
                            <strong>{goNoGoResult.dbOk ? 'PASS' : 'FAIL'}</strong>
                        </div>
                        <div className={`p-3 rounded border text-sm flex justify-between items-center ${goNoGoResult.redisOk ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-red-950/20 border-red-900/50 text-red-500'}`}>
                            <span>Redis ping</span>
                            <strong>{goNoGoResult.redisOk ? 'PASS' : 'FAIL'}</strong>
                        </div>
                        <div className={`p-3 rounded border text-sm flex justify-between items-center ${goNoGoResult.secretsVerified ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-red-950/20 border-red-900/50 text-red-500'}`}>
                            <span>Segredos Validados</span>
                            <strong>{goNoGoResult.secretsVerified ? 'PASS' : 'FAIL'}</strong>
                        </div>
                        <div className={`p-3 rounded border text-sm flex justify-between items-center ${goNoGoResult.incidentOff ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-red-950/20 border-red-900/50 text-red-500'}`}>
                            <span>Incident Mode / Lockdowns</span>
                            <strong>{goNoGoResult.incidentOff ? 'PASS' : 'FAIL'}</strong>
                        </div>

                        <div className={`p-3 rounded border text-sm flex justify-between items-center font-bold col-span-1 border-dashed ${goNoGoResult.passed ? 'bg-emerald-900/40 border-emerald-500 text-emerald-100' : 'bg-red-900/40 border-red-500 text-red-100'}`}>
                            <span>RESULTADO FINAL:</span>
                            <span>{goNoGoResult.passed ? 'APPROVED' : 'DENIED'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
