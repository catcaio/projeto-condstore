'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/ui/components';

interface FinOpsAlert {
    id: string;
    prevState: string;
    nextState: string;
    reason: string;
    projectedDaysToHardLimit: string | null;
    currentMonthUsd: string;
    monthlyBudgetUsd: string;
    burnRatePerDay: string | null;
    createdAt: string;
}

export default function FinOpsAlertsPage() {
    const [alerts, setAlerts] = useState<FinOpsAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch('/api/cockpit/finops/alerts?limit=50')
            .then(res => {
                if (!res.ok) throw new Error('Falha ao carregar alertas');
                return res.json();
            })
            .then(data => setAlerts(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <Link href="/cockpit" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
                    ← Voltar ao Cockpit
                </Link>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>Histórico de Alertas FinOps</h1>
            </div>

            <Card>
                <CardHeader>
                    <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Últimos 50 alertas registrados</h2>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>Carregando alertas...</div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>Ocorreu um erro ao buscar o histórico de alertas.</div>
                    ) : alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>Nenhum alerta registrado para este tenant.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                                        <th style={{ padding: '12px 8px' }}>Data / Hora</th>
                                        <th style={{ padding: '12px 8px' }}>Razão</th>
                                        <th style={{ padding: '12px 8px' }}>Transição</th>
                                        <th style={{ padding: '12px 8px' }}>Gasto Atual / Orçamento</th>
                                        <th style={{ padding: '12px 8px' }}>Burn Rate / Lock Est.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map(alert => {
                                        let icon = 'ℹ️';
                                        if (alert.reason === 'preemptive_3d') icon = '🛡️ Preventivo';
                                        if (alert.reason === 'soft_limit') icon = '⚠️ Soft Limit';
                                        if (alert.reason === 'hard_limit') icon = '🔴 Hard Limit';

                                        return (
                                            <tr key={alert.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '16px 8px', color: '#6b7280' }}>
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '16px 8px', fontWeight: 500 }}>
                                                    {icon}
                                                </td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <span style={{ color: '#6b7280', fontSize: 'var(--font-size-xs)' }}>{alert.prevState}</span>
                                                    {' → '}
                                                    <span style={{ fontWeight: 600 }}>{alert.nextState}</span>
                                                </td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <div style={{ fontWeight: 600 }}>${Number(alert.currentMonthUsd).toFixed(2)}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#6b7280' }}>/ ${Number(alert.monthlyBudgetUsd).toFixed(2)}</div>
                                                </td>
                                                <td style={{ padding: '16px 8px' }}>
                                                    <div>${Number(alert.burnRatePerDay || 0).toFixed(2)}/dia</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#6b7280' }}>
                                                        {alert.projectedDaysToHardLimit ? `${alert.projectedDaysToHardLimit} dias` : '—'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
