'use client';

import { Card, CardContent, CardHeader } from '@/ui/components';

export function CockpitFunnelBlock({ funnel, loading }: { funnel: any, loading: boolean }) {
    if (loading && !funnel) {
        return <div className="h-64 rounded-xl w-full bg-slate-200 animate-pulse" />;
    }

    if (!funnel && !loading) {
        return (
            <Card>
                <CardHeader heading="Funil de Conversão (7 dias)" subheading="Acompanhe o engajamento e as quebras nas etapas do assistente" />
                <CardContent>
                    <div className="text-center py-8 text-sm text-slate-500">
                        Dados do funil temporariamente indisponíveis.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const counts = funnel?.window_7d?.counts || {};
    
    // Funnel Steps
    const steps = [
        { id: 'flow_started', label: 'Sessões Iniciadas', count: counts.flow_started ?? 0 },
        { id: 'intent_detected', label: 'Intenção Detectada', count: counts.intent_detected ?? 0 },
        { id: 'asked_cep', label: 'Solicitou CEP', count: counts.asked_cep ?? 0 },
        { id: 'cep_provided', label: 'CEP Preenchido', count: counts.cep_provided ?? 0 },
        { id: 'freight_quoted', label: 'Cotações de Frete', count: counts.freight_quoted ?? 0 },
    ];

    const validCounts = steps.map(s => s.count).filter(c => typeof c === 'number' && !isNaN(c));
    const maxCount = validCounts.length > 0 ? Math.max(...validCounts, 1) : 1;

    return (
        <Card>
            <CardHeader 
                heading="Funil de Conversão (7 dias)" 
                subheading="Acompanhe o engajamento e as quebras nas etapas do assistente"
            />
            <CardContent className="space-y-6">
                <div className="flex flex-col space-y-3">
                    {steps.map((step, idx) => {
                        const previousCount = idx === 0 ? step.count : steps[idx - 1].count;
                        const validPrev = typeof previousCount === 'number' && previousCount > 0;
                        const validCurr = typeof step.count === 'number' && !isNaN(step.count) && step.count >= 0;
                        const dropoff = validPrev && validCurr ? Math.max(0, ((previousCount - step.count) / previousCount) * 100) : null;
                        const percentageOfTotal = validCurr && maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                        
                        return (
                            <div key={step.id} className="relative w-full">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                                    <div className="text-right flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900">
                                            {validCurr ? step.count.toLocaleString() : '-'}
                                        </span>
                                        {idx > 0 && dropoff !== null && (
                                            <span className="ml-2 text-xs text-slate-500">(-{dropoff.toFixed(1)}%)</span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-4 rounded-full transition-all duration-500"
                                        style={{ width: `${percentageOfTotal}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
