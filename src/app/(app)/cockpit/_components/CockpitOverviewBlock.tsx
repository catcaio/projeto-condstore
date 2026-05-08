'use client';

import { Card, CardContent } from '@/ui/components';

export function CockpitOverviewBlock({ metrics, funnel, loading }: { metrics: any, funnel: any, loading: boolean }) {
    if (loading && (!metrics || !funnel)) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(k => <div key={k} className="h-28 rounded-xl bg-slate-200 animate-pulse" />)}
            </div>
        );
    }

    const mensagensHoje = metrics?.mensagensHoje ?? null;
    const cotacoesHoje = metrics?.cotacoesHoje ?? null;
    const pedidosHoje = metrics?.pedidosHoje ?? null;
    const handoffsHoje = metrics?.handoffsHoje ?? null;
    const erros24h = metrics?.erros24h ?? null;

    const tempoResposta = metrics?.tempoMedioRespostaMin ?? null;
    const tempoCotacao = metrics?.tempoMedioCotacaoMin ?? null;
    const conversao = metrics?.conversaoCotacaoPedido ?? null;
    
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox title="Mensagens (Hoje)" value={mensagensHoje} />
            <MetricBox title="Cotações (Hoje)" value={cotacoesHoje} />
            <MetricBox title="Pedidos (Hoje)" value={pedidosHoje} />
            <MetricBox title="Handoffs (Hoje)" value={handoffsHoje} />

            <MetricBox title="T. Resposta (Médio)" value={tempoResposta} suffix=" min" />
            <MetricBox title="T. Cotação (Médio)" value={tempoCotacao} suffix=" min" />
            <MetricBox title="Conversão C/P" value={conversao} suffix="%" />
            <MetricBox title="Erros Críticos (24h)" value={erros24h} alert={erros24h !== null && erros24h > 0} />
        </div>
    );
}

function MetricBox({ title, value, alert = false, suffix = '' }: { title: string, value: number | null, alert?: boolean, suffix?: string }) {
    const hasData = value !== null && !isNaN(value);
    const displayValue = hasData
        ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + suffix
        : 'sem dados';

    return (
        <Card variant="elevated" className={`overflow-hidden border-l-4 ${alert ? 'border-red-500' : 'border-indigo-500'}`}>
            <CardContent className="p-5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {title}
                </span>
                <span className={`text-2xl font-extrabold tracking-tight ${alert ? 'text-red-600' : 'text-slate-800'} ${!hasData ? 'text-slate-400 italic text-lg' : ''}`}>
                    {displayValue}
                </span>
            </CardContent>
        </Card>
    );
}
