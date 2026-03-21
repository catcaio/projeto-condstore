'use client';

import { Card, CardContent, CardHeader } from '@/ui/components';
import { GroupByFilter } from './CockpitOperationalDashboard';

export function CockpitAttributionBlock({ funnel, groupBy, loading }: { funnel: any, groupBy: GroupByFilter, loading: boolean }) {
    if (loading && !funnel) {
        return <div className="h-64 rounded-xl w-full bg-slate-200 animate-pulse" />;
    }

    const breakdown = funnel?.attribution_breakdown_7d?.buckets || [];

    if (groupBy === 'none') {
        return (
            <Card>
                <CardHeader 
                    heading="Atribuição de Canais" 
                    subheading="Selecione um filtro de agrupamento (utm_source ou utm_campaign) para visualizar o detalhamento"
                />
            </Card>
        );
    }

    return (
        <Card variant="elevated" className="h-full">
            <CardHeader 
                heading={`Top ${groupBy === 'utm_source' ? 'Origens (Source)' : 'Campanhas (Campaign)'}`}
                subheading="Volume de engajamento captado nos últimos 7 dias"
            />
            <CardContent>
                {breakdown.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500">
                        Nenhum dado de atribuição no período.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {breakdown.map((b: any, i: number) => (
                            <li key={i} className="py-3 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-800 truncate pr-4">
                                    {b.key === '(none)' ? 'Orgânico / Desconhecido' : b.key}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {b.count}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
