"use client";

import React, { useEffect, useState } from 'react';
import { Section } from '../../../ui/primitives/Section';
import { Stack } from '../../../ui/primitives/Stack';
import { MetricCard } from '../../../components/admin/MetricCard';
import { RevenueChart } from '../../../components/admin/RevenueChart';
import { BillingMetrics } from '../../../lib/metrics/billingMetrics';
import { track } from '../../../utils/track';

export default function AdminBillingPage() {
    const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adminKey, setAdminKey] = useState<string>('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        track("admin_billing_view");

        // Simple client-side auth state for demo. 
        // Real app might use cookies/session. 
        const storedKey = localStorage.getItem('admin_key');
        if (storedKey) {
            setAdminKey(storedKey);
            setIsAuthenticated(true);
        } else {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !adminKey) return;

        const fetchMetrics = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/metrics', {
                    headers: {
                        'x-admin-key': adminKey
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setMetrics(data);
                    setError(null);
                } else if (response.status === 401) {
                    setError('Senha incorreta.');
                    setIsAuthenticated(false);
                    localStorage.removeItem('admin_key');
                } else {
                    setError('Erro ao buscar métricas.');
                }
            } catch (err) {
                setError('Erro de rede.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [isAuthenticated, adminKey]);

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const key = fd.get('adminKey') as string;
        if (key) {
            localStorage.setItem('admin_key', key);
            setAdminKey(key);
            setIsAuthenticated(true);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
                    <h1 className="text-xl font-bold">Admin Login</h1>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <input
                        name="adminKey"
                        type="password"
                        placeholder="ADMIN_SECRET"
                        className="p-3 rounded border border-gray-300 w-full"
                        required
                    />
                    <button type="submit" className="bg-black text-white p-3 rounded font-semibold">
                        Acessar Cockpit
                    </button>
                </form>
            </div>
        );
    }

    // Dummy chart data representing new subs over last 30 days
    const dummyChartData = [
        0, 1, 0, 2, 0, 0, 3, 1, 4, 0,
        0, 5, 2, 1, 0, 0, 0, 1, 0, 2,
        3, 0, 1, 0, 4, 1, 2, 0, 3, metrics?.newLast30Days || 0
    ];

    return (
        <div className="min-h-screen bg-[var(--surface-base)] pb-[env(safe-area-inset-bottom,24px)]">
            <Section>
                <div className="pt-8 pb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] leading-tight tracking-tight mb-2">
                            Receita & Assinaturas
                        </h1>
                        <p className="text-[var(--text-secondary)] text-[var(--text-muted)]">
                            Visão geral do faturamento (Store Local).
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('admin_key');
                            setIsAuthenticated(false);
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-black"
                    >
                        Sair
                    </button>
                </div>

                {isLoading ? (
                    <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-[var(--radius-card)]"></div>
                        ))}
                    </div>
                ) : metrics ? (
                    <Stack space={24} className="mt-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                label="MRR"
                                value={`R$ ${metrics.mrr.toFixed(2)}`}
                                delta={{ value: `${((metrics.newLast30Days / (metrics.activeCount || 1)) * 100).toFixed(1)}%`, type: 'positive' }}
                            />
                            <MetricCard
                                label="Assinantes Ativos"
                                value={metrics.totalCurrent}
                                delta={{ value: `${metrics.newLast30Days} novos (30d)`, type: 'neutral' }}
                            />
                            <MetricCard
                                label="ARPU"
                                value={`R$ ${metrics.arpu.toFixed(2)}`}
                            />
                            <MetricCard
                                label="Taxa de Churn"
                                value={`${metrics.churnRate.toFixed(1)}%`}
                                delta={{ value: 'Histórico', type: metrics.churnRate > 5 ? 'negative' : 'neutral' }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <MetricCard
                                label="Em período de teste"
                                value={metrics.trialingCount}
                            />
                            <MetricCard
                                label="CancelamentosTotais"
                                value={metrics.canceledCount}
                            />
                        </div>

                        <div className="pt-4">
                            <RevenueChart
                                data={dummyChartData}
                                label="Novas Assinaturas (Últimos 30 dias)"
                            />
                        </div>
                    </Stack>
                ) : (
                    <p className="mt-6 text-red-500">{error || 'Não foi possível carregar os dados.'}</p>
                )}
            </Section>
        </div>
    );
}
