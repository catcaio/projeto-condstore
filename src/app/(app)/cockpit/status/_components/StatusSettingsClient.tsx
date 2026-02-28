'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { runGoNoGoChecks } from './actions';

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
    db: 'ok' | 'fail';
    redis: 'ok' | 'fail';
    rateLimiterFallback: RateLimiterFallback;
    circuitBreakers: CircuitBreakerStatus[];
    outboundEnabled: boolean;
    incidentMode: boolean;
    unverifiedSecrets: string[];
}

export function StatusSettingsClient({ tenantId }: { tenantId: string }) {
    const [stats, setStats] = useState<HealthSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [goNoGoLoading, setGoNoGoLoading] = useState(false);
    const [goNoGoResult, setGoNoGoResult] = useState<GoNoGoResults | null>(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/health`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setLastUpdated(new Date());
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Outbound & Kill Switch */}
                <div className={`p-5 rounded-2xl border transition-colors ${stats.outboundEnabled ? 'bg-zinc-900 border-zinc-800' : 'bg-red-950/30 border-red-900/50'}`}>
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Kill Switch (Outbound)</h3>
                    <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${stats.outboundEnabled ? 'text-zinc-100' : 'text-red-500'}`}>
                            {stats.outboundEnabled ? 'ONLINE' : 'LOCKED'}
                        </div>
                    </div>
                    {stats.outboundEnabled ? (
                        <p className="text-xs text-zinc-500 mt-2">Tráfego externo habilitado.</p>
                    ) : (
                        <p className="text-xs text-red-400 mt-2">Todas chamadas externas suspensas.</p>
                    )}
                </div>

                {/* Incident Mode */}
                <div className={`p-5 rounded-2xl border transition-colors ${stats.incidentMode ? 'bg-amber-950/30 border-amber-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Incident Mode</h3>
                    <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${stats.incidentMode ? 'text-amber-500' : 'text-zinc-400'}`}>
                            {stats.incidentMode ? 'ATIVO' : 'IDLE'}
                        </div>
                    </div>
                    {stats.incidentMode && (
                        <p className="text-xs text-amber-400 mt-2">Modo passivo forçando bypass de inbound.</p>
                    )}
                </div>

                {/* Circuit Breakers */}
                <div className="p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Circuit Breakers Abertos</h3>
                    <div className="flex flex-col gap-1 mt-2">
                        {stats.circuitBreakers.length === 0 ? (
                            <div className="text-sm font-semibold text-emerald-400">Todos os circuitos fechados</div>
                        ) : (
                            stats.circuitBreakers.map((cb, idx) => (
                                <div key={idx} className="text-sm font-medium text-red-400 flex justify-between">
                                    <span>{cb.provider}</span>
                                    <span>{cb.failures} falhas</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Databases */}
                <div className="p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Database / Redis Ping</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500 uppercase">Principal</span>
                            <span className={`text-sm font-bold ${stats.db === 'ok' ? 'text-emerald-400' : 'text-red-500'}`}>{stats.db === 'ok' ? 'OK' : 'FAIL'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500 uppercase">Cache (Redis)</span>
                            <span className={`text-sm font-bold ${stats.redis === 'ok' ? 'text-emerald-400' : 'text-amber-500'}`}>{stats.redis === 'ok' ? 'OK' : 'FAIL'}</span>
                        </div>
                    </div>
                </div>

                {/* Rate Limiter Fail-open */}
                <div className={`p-5 rounded-2xl border ${stats.rateLimiterFallback.count > 0 ? 'bg-zinc-900 border-amber-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Rate Limiter Fallback</h3>
                    <div className="mt-2 text-sm text-zinc-300">
                        {stats.rateLimiterFallback.count === 0 ? (
                            <span className="text-emerald-400 font-semibold">Saudável</span>
                        ) : (
                            <div className="flex flex-col">
                                <span className="font-semibold text-amber-500">Ativado ({stats.rateLimiterFallback.count} hits)</span>
                                {stats.rateLimiterFallback.lastSeenAt && (
                                    <span className="text-xs text-zinc-500">Último disparo: {new Date(stats.rateLimiterFallback.lastSeenAt).toLocaleTimeString()}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Secrets Governance */}
                <div className={`p-5 rounded-2xl border ${stats.unverifiedSecrets.length > 0 ? 'bg-amber-950/20 border-amber-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <h3 className="text-sm text-zinc-400 font-medium mb-1">Segredos Pendentes de Teste</h3>
                    <div className="mt-2 text-sm text-zinc-300">
                        {stats.unverifiedSecrets.length === 0 ? (
                            <span className="text-emerald-400 font-semibold">Tudo verificado</span>
                        ) : (
                            <div className="flex flex-col">
                                <span className="font-semibold text-amber-500">{stats.unverifiedSecrets.length} escopos rotacionados e não verificados</span>
                                <div className="flex gap-2 text-xs mt-1 text-amber-500/80">
                                    {stats.unverifiedSecrets.map(s => <span key={s}>[{s}]</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
