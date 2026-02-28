import React from 'react';
import { Card, CardContent, CardHeader, Badge, Button } from '@/ui/components';
import { getActivationStats } from './queries';

export const metadata = {
    title: 'Activation Funnel | Cockpit',
};

export default async function ActivationFunnelPage({
    searchParams,
}: {
    searchParams: { days?: string };
}) {
    const days = parseInt(searchParams.days || '30', 10);
    const clampDays = Math.max(1, Math.min(days, 90));

    let stats;
    try {
        stats = await getActivationStats(clampDays);
    } catch (err) {
        return <div className="p-8 text-red-500">Erro ao buscar dados de ativação.</div>;
    }

    const { funnel, ctaClicks, mostViewedSections, sourceBreakdown } = stats;

    const winRate = funnel.clickCta > 0 ? ((funnel.entrySuccess / funnel.clickCta) * 100).toFixed(1) : '0';
    const dropoffAuth = funnel.entryStart > 0 ? ((1 - (funnel.entrySuccess / funnel.entryStart)) * 100).toFixed(1) : '0';

    return (
        <div className="flex-1 space-y-6 overflow-hidden p-6 md:p-8 flex flex-col os-root text-[hsl(var(--ui-text))] min-h-full">
            <div className="flex items-center justify-between z-10">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">Activation Funnel</h2>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Performance dos botões de aquisição e login (últimos {clampDays} dias)</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">First-Party Data</Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <span className="text-sm font-medium">Cliques de CTA (Total)</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnel.clickCta}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <span className="text-sm font-medium">Inícios de Login (Entry)</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnel.entryStart}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <span className="text-sm font-medium">Logins com Sucesso</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[hsl(var(--ui-success))]">{funnel.entrySuccess}</div>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">+{winRate}% Conversão (CTA → Success)</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <span className="text-sm font-medium">Desistência Auth</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[hsl(var(--ui-danger))]">{dropoffAuth}%</div>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">Após carregar tela de login</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-sm col-span-1 lg:col-span-1">
                    <CardHeader className="pb-4">
                        <span className="text-base font-semibold">Tops CTAs (Cliques)</span>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {ctaClicks.length === 0 ? <li className="text-[hsl(var(--ui-text-muted))]">Sem dados</li> : null}
                            {ctaClicks.map((item, i) => (
                                <li key={i} className="flex justify-between items-center text-sm">
                                    <span className="truncate">{item.element}</span>
                                    <span className="font-semibold">{item.count}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-sm col-span-1 lg:col-span-1">
                    <CardHeader className="pb-4">
                        <span className="text-base font-semibold">Seções Mais Vistas</span>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {mostViewedSections.length === 0 ? <li className="text-[hsl(var(--ui-text-muted))]">Sem dados</li> : null}
                            {mostViewedSections.map((item, i) => (
                                <li key={i} className="flex justify-between items-center text-sm">
                                    <span className="truncate">{item.section}</span>
                                    <span className="font-semibold">{item.count}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-sm col-span-1 lg:col-span-1">
                    <CardHeader className="pb-4">
                        <span className="text-base font-semibold">Origem Conversões (Source)</span>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {sourceBreakdown.length === 0 ? <li className="text-[hsl(var(--ui-text-muted))]">Sem dados</li> : null}
                            {sourceBreakdown.map((item, i) => (
                                <li key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col truncate">
                                        <span className="truncate">{item.source}</span>
                                        <span className="text-xs text-[hsl(var(--ui-text-muted))] truncate">{item.campaign}</span>
                                    </div>
                                    <span className="font-semibold">{item.count}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
