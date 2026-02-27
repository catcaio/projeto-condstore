import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FinOpsData {
    state: 'unlocked' | 'degraded' | 'degraded_preemptive' | 'locked';
    monthlyBudgetUsd: number;
    currentMonthUsd: number;
    percentUsed: number;
    burnRatePerDay: number;
    projectedDaysToHardLimit: number | null;
    softLimitPercent: number;
    hardLimitPercent: number;
    estimatedSavingsFromDegradeUsd: number;
    lastBudgetResetAt: string | null;
}

interface FinOpsAlert {
    id: string;
    nextState: string;
    reason: string;
    createdAt: string;
}

// ─── State badge ───────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: FinOpsData['state'] }) {
    const map = {
        unlocked: { label: 'Unlocked', bg: 'var(--finops-unlocked)', dot: '#22c55e' },
        degraded: { label: 'Degraded', bg: 'var(--finops-degraded)', dot: '#f59e0b' },
        degraded_preemptive: { label: 'Preemptive', bg: 'rgba(59, 130, 246, 0.15)', dot: '#3b82f6' },
        locked: { label: 'Locked', bg: 'var(--finops-locked)', dot: '#ef4444' },
    } as const;

    const { label, bg, dot } = map[state];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                letterSpacing: '0.02em',
                background: bg,
                color: state === 'unlocked' ? '#166534' : state === 'degraded' ? '#92400e' : state === 'degraded_preemptive' ? '#1e3a8a' : '#991b1b',
            }}
        >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
            {label}
        </span>
    );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function BudgetBar({
    percent, softLimit, hardLimit, state,
}: { percent: number; softLimit: number; hardLimit: number; state: FinOpsData['state'] }) {
    const barColor =
        state === 'locked' ? '#ef4444' :
            state === 'degraded' ? '#f59e0b' :
                state === 'degraded_preemptive' ? '#3b82f6' :
                    '#22c55e';

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* Track */}
            <div style={{
                height: 8, borderRadius: 4,
                background: 'rgba(139,139,139,0.15)',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Soft threshold marker */}
                <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${softLimit}%`,
                    width: 1.5,
                    background: 'rgba(245,158,11,0.6)',
                    zIndex: 1,
                }} />
                {/* Hard threshold marker */}
                <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${hardLimit}%`,
                    width: 1.5,
                    background: 'rgba(239,68,68,0.7)',
                    zIndex: 1,
                }} />
                {/* Fill */}
                <div style={{
                    height: '100%',
                    width: `${Math.min(100, percent)}%`,
                    background: barColor,
                    borderRadius: 4,
                    transition: 'width 0.6s ease',
                }} />
            </div>
            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)' }}>0%</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)' }}>{softLimit}%↑</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)' }}>100%</span>
            </div>
        </div>
    );
}

// ─── Alert banner ──────────────────────────────────────────────────────────────

function DaysAlert({ days, state }: { days: number | null, state: FinOpsData['state'] }) {
    if (state === 'degraded_preemptive') {
        return (
            <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-xs)', color: '#2563eb', fontWeight: 500
            }}>
                <span style={{ fontSize: 'var(--font-size-md)' }}>🛡️</span>
                Modo preventivo ativado (risco de lock em {days !== null ? days.toFixed(1) : '?'} dias)
            </div>
        );
    }

    if (days === null || days > 3) return null;
    const urgent = days <= 1;
    return (
        <div style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${urgent ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--font-size-xs)',
            color: urgent ? '#dc2626' : '#d97706',
            fontWeight: 500,
        }}>
            <span style={{ fontSize: 'var(--font-size-md)' }}>{urgent ? '🔴' : '⚠️'}</span>
            {days <= 0
                ? 'Orçamento esgotado — LLM bloqueado'
                : `Lock estimado em ${days.toFixed(1)} dia${days < 2 ? '' : 's'}`}
        </div>
    );
}

// ─── Plan types ───────────────────────────────────────────────────────────────

interface AvailablePlan {
    id: string;
    name: string;
    monthlyPriceUsd: number;
    monthlyBudgetUsd: number;
}

// ─── Main card ─────────────────────────────────────────────────────────────────

export function FinOpsCard() {
    const [data, setData] = useState<FinOpsData | null>(null);
    const [alerts, setAlerts] = useState<FinOpsAlert[] | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Upgrade state
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [plans, setPlans] = useState<AvailablePlan[]>([]);
    const [upgrading, setUpgrading] = useState(false);
    const [upgradeError, setUpgradeError] = useState<string | null>(null);

    const loadPlans = async () => {
        try {
            const res = await fetch('/api/cockpit/billing/upgrade');
            if (res.ok) {
                const json = await res.json();
                setPlans(json.plans ?? []);
            }
        } catch {
            // silently fail — user can retry
        }
    };

    const handleUpgradeClick = () => {
        setShowUpgrade(true);
        setUpgradeError(null);
        void loadPlans();
    };

    const handleSelectPlan = async (planId: string) => {
        setUpgrading(true);
        setUpgradeError(null);
        try {
            const res = await fetch('/api/cockpit/billing/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error?.message ?? 'Erro ao realizar upgrade.');
            }
            // Otimista: reload
            window.location.reload();
        } catch (err) {
            setUpgradeError((err as Error).message);
            setUpgrading(false);
        }
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/cockpit/finops').then((r) => {
                if (!r.ok) throw new Error(`${r.status}`);
                return r.json() as Promise<FinOpsData>;
            }),
            fetch('/api/cockpit/finops/alerts?limit=3').then((r) => {
                if (!r.ok) return null; // fallback gracefully if alerts fail
                return r.json() as Promise<FinOpsAlert[]>;
            }).catch(() => null),
        ])
            .then(([finopsData, finopsAlerts]) => {
                setData(finopsData);
                setAlerts(finopsAlerts);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <style>{`
        :root {
          --finops-unlocked: rgba(34,197,94,0.15);
          --finops-degraded: rgba(245,158,11,0.15);
          --finops-locked:   rgba(239,68,68,0.15);
          --finops-surface:  var(--bg-hover);
          --finops-border:   var(--bg-hover);
          --finops-muted:    rgba(160,160,160,0.7);
          --finops-text:     rgba(240,240,240,0.92);
        }
        .finops-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; }
        .finops-label { font-size: 12px; color: var(--finops-muted); }
        .finops-value { font-size: 13px; font-weight: 600; color: var(--finops-text); font-variant-numeric: tabular-nums; }
        .finops-divider { border: none; border-top: 1px solid var(--finops-border); margin: 2px 0; }
      `}</style>

            <div style={{
                background: 'linear-gradient(135deg, rgba(24,24,40,0.95) 0%, rgba(18,18,32,0.98) 100%)',
                border: '1px solid var(--finops-border)',
                borderRadius: 16,
                padding: '20px 22px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 24px var(--shadow-soft)',
                fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--finops-text)', letterSpacing: '0.01em' }}>
                            💰 FinOps Budget
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)', marginTop: 2 }}>
                            {data?.lastBudgetResetAt ? (
                                (() => {
                                    const d = new Date(data.lastBudgetResetAt);
                                    const now = new Date();
                                    const resetMonthKey = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
                                    const currentMonthKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;

                                    if (resetMonthKey !== currentMonthKey) {
                                        return <span style={{ color: '#f59e0b' }}>⏳ Reset pendente...</span>;
                                    }
                                    return `Último reset: ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} · Monitoramento de custo`;
                                })()
                            ) : (
                                'Monitoramento de custo LLM'
                            )}
                        </div>
                    </div>
                    {data && <StateBadge state={data.state} />}
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--finops-muted)', fontSize: 'var(--font-size-sm)' }}>
                        Carregando…
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#ef4444', fontSize: 'var(--font-size-sm)' }}>
                        Erro ao carregar dados FinOps
                    </div>
                )}

                {/* Data */}
                {!loading && data && (
                    <>
                        {/* Budget bar */}
                        <BudgetBar
                            percent={data.percentUsed}
                            softLimit={data.softLimitPercent}
                            hardLimit={data.hardLimitPercent}
                            state={data.state}
                        />

                        <div style={{ marginTop: 14 }}>
                            <div className="finops-row">
                                <span className="finops-label">Gasto este mês</span>
                                <span className="finops-value">
                                    ${data.currentMonthUsd.toFixed(4)}
                                    <span style={{ fontWeight: 400, color: 'var(--finops-muted)', fontSize: 'var(--font-size-xs)' }}>
                                        {' '}/ ${data.monthlyBudgetUsd > 0 ? data.monthlyBudgetUsd.toFixed(2) : '∞'}
                                    </span>
                                </span>
                            </div>
                            <hr className="finops-divider" />
                            <div className="finops-row">
                                <span className="finops-label">% utilizado</span>
                                <span className="finops-value" style={{
                                    color: data.percentUsed >= data.hardLimitPercent ? '#ef4444' :
                                        data.percentUsed >= data.softLimitPercent ? '#f59e0b' : '#22c55e'
                                }}>
                                    {data.percentUsed.toFixed(1)}%
                                </span>
                            </div>
                            <hr className="finops-divider" />
                            <div className="finops-row">
                                <span className="finops-label">Burn rate</span>
                                <span className="finops-value">
                                    {data.burnRatePerDay > 0 ? `$${data.burnRatePerDay.toFixed(4)}/dia` : '—'}
                                </span>
                            </div>
                            {data.state !== 'locked' && (
                                <>
                                    <hr className="finops-divider" />
                                    <div className="finops-row">
                                        <span className="finops-label">Lock estimado</span>
                                        <span className="finops-value">
                                            {data.projectedDaysToHardLimit === null
                                                ? '—'
                                                : data.projectedDaysToHardLimit <= 0
                                                    ? <span style={{ color: '#ef4444' }}>Agora</span>
                                                    : `${data.projectedDaysToHardLimit.toFixed(1)} dias`}
                                        </span>
                                    </div>
                                </>
                            )}
                            {data.estimatedSavingsFromDegradeUsd > 0 && (
                                <>
                                    <hr className="finops-divider" />
                                    <div className="finops-row">
                                        <span className="finops-label">Economia est. (degrade 7d)</span>
                                        <span className="finops-value" style={{ color: '#22c55e' }}>
                                            +${data.estimatedSavingsFromDegradeUsd.toFixed(4)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Alert Status Banner */}
                        <DaysAlert days={data.projectedDaysToHardLimit} state={data.state} />

                        {data.state === 'locked' && (
                            <div style={{ marginTop: 12 }}>
                                {!showUpgrade ? (
                                    <button
                                        id="btn-upgrade-plan"
                                        onClick={handleUpgradeClick}
                                        style={{
                                            width: '100%', padding: '10px 16px',
                                            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                                            color: '#fff', border: 'none', borderRadius: 8,
                                            fontSize: 'var(--font-size-sm)', fontWeight: 700,
                                            cursor: 'pointer', letterSpacing: '0.02em',
                                        }}
                                    >
                                        ⚡ Upgrade Plan
                                    </button>
                                ) : (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: 10, padding: '14px 16px',
                                    }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>
                                            Escolha um plano
                                        </div>
                                        {plans.length === 0 ? (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)' }}>Carregando planos…</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {plans.map((plan) => (
                                                    <button
                                                        key={plan.id}
                                                        id={`btn-plan-${plan.id}`}
                                                        disabled={upgrading}
                                                        onClick={() => void handleSelectPlan(plan.id)}
                                                        style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            width: '100%', padding: '9px 12px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: 8, cursor: upgrading ? 'not-allowed' : 'pointer',
                                                            color: 'var(--finops-text)', fontSize: 'var(--font-size-xs)',
                                                            transition: 'background 0.15s',
                                                            opacity: upgrading ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 700 }}>{plan.name}</span>
                                                        <span style={{ color: 'var(--finops-muted)' }}>
                                                            {plan.monthlyPriceUsd === 0 ? 'Grátis' : `$${plan.monthlyPriceUsd}/mês`}
                                                            {' · '}
                                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                                                ${plan.monthlyBudgetUsd} budget
                                                            </span>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {upgradeError && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: '#ef4444', marginTop: 8 }}>
                                                {upgradeError}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowUpgrade(false)}
                                            style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', background: 'none', border: 'none', color: 'var(--finops-muted)', cursor: 'pointer' }}
                                        >
                                            ← Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recent Alerts List */}
                        <div style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--finops-text)' }}>Alertas recentes</span>
                                <Link
                                    href="/cockpit/finops/alerts"
                                    style={{ fontSize: 'var(--font-size-xs)', color: '#3b82f6', textDecoration: 'none' }}
                                >
                                    Ver todos →
                                </Link>
                            </div>

                            {alerts === null ? (
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)', textAlign: 'center', padding: '10px 0' }}>Carregando alertas...</div>
                            ) : alerts.length === 0 ? (
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--finops-muted)', textAlign: 'center', padding: '10px 0', background: 'var(--bg-hover)', borderRadius: 8 }}>
                                    Nenhum alerta recente emitido.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {alerts.map(alert => {
                                        let icon = 'ℹ️';
                                        if (alert.reason === 'preemptive_3d') icon = '🛡️';
                                        if (alert.reason === 'soft_limit') icon = '⚠️';
                                        if (alert.reason === 'hard_limit') icon = '🔴';

                                        return (
                                            <div key={alert.id} style={{
                                                fontSize: 'var(--font-size-xs)', color: 'var(--finops-text)',
                                                background: 'var(--finops-surface)', border: '1px solid var(--finops-border)',
                                                padding: '8px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8
                                            }}>
                                                <span style={{ fontSize: 'var(--font-size-sm)' }}>{icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: 600, display: 'block' }}>{alert.nextState}</span>
                                                    <span style={{ color: 'var(--finops-muted)', fontSize: 'var(--font-size-xs)' }}>{new Date(alert.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
