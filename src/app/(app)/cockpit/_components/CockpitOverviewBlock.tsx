'use client';

import { Card, CardContent } from '@/ui/components';

export function CockpitOverviewBlock({ metrics, funnel, loading }: { metrics: any, funnel: any, loading: boolean }) {
    if (loading && (!metrics || !funnel)) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(k => <div key={k} className="h-28 rounded-xl bg-slate-200 animate-pulse" />)}
            </div>
        );
    }

    const mensagensHoje = metrics ? metrics.mensagensHoje ?? 0 : null;
    const cotacoesHoje = metrics ? metrics.cotacoesHoje ?? 0 : null;
    const erros24h = metrics ? metrics.erros24h ?? 0 : null;
    const flowStarted = funnel ? funnel?.window_7d?.counts?.flow_started ?? 0 : null;
    
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox title="Mensagens (Hoje)" value={mensagensHoje} />
            <MetricBox title="Sessões Iniciadas (7d)" value={flowStarted} />
            <MetricBox title="Cotações (Hoje)" value={cotacoesHoje} />
            <MetricBox title="Erros Críticos (24h)" value={erros24h} alert={erros24h !== null && erros24h > 0} />
        </div>
    );
}

function MetricBox({ title, value, alert = false }: { title: string, value: number | null, alert?: boolean }) {
    const displayValue = value === null ? '-' : value.toLocaleString();

    return (
        <Card variant="elevated" className={`overflow-hidden border-l-4 ${alert ? 'border-red-500' : 'border-indigo-500'}`}>
            <CardContent className="p-5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {title}
                </span>
                <span className={`text-3xl font-extrabold tracking-tight ${alert ? 'text-red-600' : 'text-slate-800'}`}>
                    {displayValue}
                </span>
            </CardContent>
        </Card>
    );
}
