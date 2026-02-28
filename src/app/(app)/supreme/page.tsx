/**
 * /supreme — Frank Supremo Ecosystem Map
 * Server Component — leitura cross-tenant, zero mutações.
 *
 * Auth: requer x-auth-role = super_admin (via middleware) ou acesso direto com token.
 * Em dev sem middleware ativo, renderiza sem guard (use o endpoint protegido).
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────

interface TopBurnItem {
    tenantId: string;
    burnRatePerDay: number;
    percentUsed: number;
}

interface EcosystemMap {
    collectedAt: string;
    tenants: { total: number; activeLast24h: number };
    finops: { locked: number; degraded: number; preemptive: number; topBurn: TopBurnItem[] };
    webhooks: { lag: number; dlq: number; failed24h: number };
    events: { finopsDLQ: number; webhookDLQ: number };
}

// ── Data fetcher ───────────────────────────────────────────────────────────

async function fetchEcosystem(): Promise<EcosystemMap | null> {
    try {
        const headersList = await headers();
        const internalToken = process.env.INTERNAL_EXPORT_TOKEN || process.env.INTERNAL_DIAG_TOKEN;
        const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3015';

        const res = await fetch(`${base}/api/supreme/ecosystem`, {
            cache: 'no-store',
            headers: internalToken ? { 'x-internal-token': internalToken } : {},
        });

        if (!res.ok) return null;
        const json = await res.json();
        return json.data as EcosystemMap;
    } catch {
        return null;
    }
}

// ── UI Helpers ─────────────────────────────────────────────────────────────

function Card({ title, children, alert }: { title: string; children: React.ReactNode; alert?: boolean }) {
    return (
        <div style={{
            background: 'hsl(var(--card, 224 71% 4%))',
            border: `1px solid ${alert ? 'hsl(0 72% 51%)' : 'hsl(var(--border, 217 33% 17%))'}`,
            borderRadius: 'var(--radius, 0.75rem)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        }}>
            <h2 style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'hsl(var(--muted-foreground, 215 20% 65%))',
                margin: 0,
            }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground, 215 20% 65%))' }}>{label}</span>
            <span style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: accent ?? 'hsl(var(--foreground, 210 40% 98%))',
            }}>
                {value}
            </span>
        </div>
    );
}

function StatusBadge({ value, label, color }: { value: number; label: string; color: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color,
        }}>
            <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: value > 0 ? 'block' : 'none',
                boxShadow: `0 0 6px ${color}`,
            }} />
            {value} {label}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export const metadata = {
    title: 'Frank Supremo — Ecosystem Map | CONDSTORE OS',
    description: 'Painel global de observação cross-tenant do ecossistema CONDSTORE.',
};

export default async function SupremePage() {
    const headersList = await headers();
    const role = headersList.get('x-auth-role');

    // In production, guard access to super_admin only
    if (process.env.NODE_ENV === 'production' && role !== 'super_admin') {
        redirect('/login');
    }

    const map = await fetchEcosystem();

    const bg = 'hsl(222 47% 6%)';
    const cardBg = 'hsl(224 71% 7%)';
    const border = 'hsl(217 33% 14%)';
    const text = 'hsl(210 40% 98%)';
    const muted = 'hsl(215 20% 55%)';
    const accent = 'hsl(213 94% 68%)';
    const red = 'hsl(0 72% 55%)';
    const orange = 'hsl(32 95% 55%)';
    const green = 'hsl(142 71% 45%)';
    const yellow = 'hsl(48 96% 53%)';

    return (
        <div style={{
            minHeight: '100vh',
            background: bg,
            color: text,
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            padding: '2rem 1.5rem',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', borderBottom: `1px solid ${border}`, paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚡</span>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                        Frank Supremo
                    </h1>
                    <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        background: `${accent}18`,
                        color: accent,
                        border: `1px solid ${accent}40`,
                        borderRadius: '999px',
                        padding: '0.125rem 0.625rem',
                    }}>
                        Ecosystem Map
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: muted }}>
                    Visão global cross-tenant — read-only
                    {map && (
                        <> · coletado em {new Date(map.collectedAt).toLocaleTimeString('pt-BR')}</>
                    )}
                </p>
            </div>

            {!map ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: muted,
                    border: `1px dashed ${border}`,
                    borderRadius: '0.75rem',
                }}>
                    <p style={{ margin: 0, fontSize: '1rem' }}>
                        ⚠️ Não foi possível carregar os dados do ecossistema.
                    </p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>
                        Verifique INTERNAL_EXPORT_TOKEN e conectividade com o banco.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Row 1 — Tenants + FinOps States + DLQ */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        {/* Tenants */}
                        <div style={{
                            background: cardBg,
                            border: `1px solid ${border}`,
                            borderRadius: '0.75rem',
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted }}>
                                Tenants
                            </h2>
                            <Metric label="Total" value={map.tenants.total} />
                            <Metric label="Ativos 24h" value={map.tenants.activeLast24h} accent={green} />
                        </div>

                        {/* FinOps States */}
                        <div style={{
                            background: cardBg,
                            border: `1px solid ${map.finops.locked > 0 ? red : border}`,
                            borderRadius: '0.75rem',
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted }}>
                                Estados FinOps
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <StatusBadge value={map.finops.locked} label="locked" color={red} />
                                <StatusBadge value={map.finops.degraded} label="degraded" color={orange} />
                                <StatusBadge value={map.finops.preemptive} label="preemptive" color={yellow} />
                            </div>
                        </div>

                        {/* Webhook Health */}
                        <div style={{
                            background: cardBg,
                            border: `1px solid ${map.webhooks.dlq > 0 ? orange : border}`,
                            borderRadius: '0.75rem',
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted }}>
                                Webhook Health
                            </h2>
                            <Metric label="Lag (pending)" value={map.webhooks.lag} accent={map.webhooks.lag > 10 ? orange : text} />
                            <Metric label="DLQ" value={map.webhooks.dlq} accent={map.webhooks.dlq > 0 ? red : green} />
                            <Metric label="Failed 24h" value={map.webhooks.failed24h} accent={map.webhooks.failed24h > 0 ? orange : text} />
                        </div>

                        {/* Event Bus DLQ */}
                        <div style={{
                            background: cardBg,
                            border: `1px solid ${(map.events.finopsDLQ + map.events.webhookDLQ) > 0 ? red : border}`,
                            borderRadius: '0.75rem',
                            padding: '1.25rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted }}>
                                Event Bus DLQ
                            </h2>
                            <Metric label="FinOps DLQ" value={map.events.finopsDLQ} accent={map.events.finopsDLQ > 0 ? red : text} />
                            <Metric label="Webhook DLQ" value={map.events.webhookDLQ} accent={map.events.webhookDLQ > 0 ? red : text} />
                        </div>
                    </div>

                    {/* Row 2 — Top Burn Table */}
                    {map.finops.topBurn.length > 0 && (
                        <div style={{
                            background: cardBg,
                            border: `1px solid ${border}`,
                            borderRadius: '0.75rem',
                            overflow: 'hidden',
                        }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${border}` }}>
                                <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted }}>
                                    🔥 Top Burn Rate — USD/dia
                                </h2>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                                        {['#', 'Tenant ID', 'Burn / dia', '% Usado'].map((h, i) => (
                                            <th key={h} style={{
                                                padding: '0.625rem 1.5rem',
                                                textAlign: i === 0 ? 'center' : i > 1 ? 'right' : 'left',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                color: muted,
                                                letterSpacing: '0.04em',
                                                textTransform: 'uppercase',
                                            }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {map.finops.topBurn.map((item, idx) => (
                                        <tr key={item.tenantId} style={{
                                            borderBottom: `1px solid ${border}`,
                                            background: idx % 2 === 0 ? 'transparent' : `${accent}06`,
                                        }}>
                                            <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center', color: muted, fontVariantNumeric: 'tabular-nums' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ padding: '0.75rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                                <Link
                                                    href={{ pathname: '/cockpit', query: { tenantId: item.tenantId } }}
                                                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                                                >
                                                    {item.tenantId}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: item.burnRatePerDay > 1 ? orange : text }}>
                                                ${item.burnRatePerDay.toFixed(4)}
                                            </td>
                                            <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    fontWeight: 700,
                                                    fontSize: '0.8125rem',
                                                    background: item.percentUsed >= 80 ? `${red}20` : item.percentUsed >= 50 ? `${orange}20` : `${green}18`,
                                                    color: item.percentUsed >= 80 ? red : item.percentUsed >= 50 ? orange : green,
                                                }}>
                                                    {item.percentUsed}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer */}
                    <p style={{ textAlign: 'right', fontSize: '0.75rem', color: muted, margin: 0 }}>
                        Frank Supremo v0 · Ecosystem Map · {new Date(map.collectedAt).toLocaleString('pt-BR')}
                    </p>
                </div>
            )}
        </div>
    );
}
