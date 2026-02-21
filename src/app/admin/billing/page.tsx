import React from 'react';
import { Section } from '../../../ui/primitives/Section';
import { Stack } from '../../../ui/primitives/Stack';
import { MetricCard } from '../../../components/admin/MetricCard';
import { RevenueChart } from '../../../components/admin/RevenueChart';
import { computeBillingMetrics } from '../../../lib/metrics/billingMetrics';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
    // Fetch metrics directly on the server side
    const metrics = await computeBillingMetrics();

    // Dummy chart data representing new subs over last 30 days
    const dummyChartData = [
        0, 1, 0, 2, 0, 0, 3, 1, 4, 0,
        0, 5, 2, 1, 0, 0, 0, 1, 0, 2,
        3, 0, 1, 0, 4, 1, 2, 0, 3, metrics.newLast30Days || 0
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
                </div>

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
            </Section>
        </div>
    );
}
