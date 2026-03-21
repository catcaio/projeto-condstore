'use client';

import { Card, CardContent, CardHeader } from '@/ui/components';

export function CockpitFunnelBlock({ funnel, loading }: { funnel: any, loading: boolean }) {
    if (loading && !funnel) {
        return <div className="h-64 rounded-xl w-full bg-slate-200 animate-pulse" />;
    }

    const counts = funnel?.window_7d?.counts || {};
    
    // Funnel Steps
    const steps = [
        { id: 'flow_started', label: 'Sessões Iniciadas', count: counts.flow_started || 0 },
        { id: 'intent_detected', label: 'Intenção Detectada', count: counts.intent_detected || 0 },
        { id: 'asked_cep', label: 'Solicitou CEP', count: counts.asked_cep || 0 },
        { id: 'cep_provided', label: 'CEP Preenchido', count: counts.cep_provided || 0 },
        { id: 'freight_quoted', label: 'Cotações de Frete', count: counts.freight_quoted || 0 },
    ];

    const maxCount = Math.max(...steps.map(s => s.count), 1);

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
                        const dropoff = previousCount > 0 ? ((previousCount - step.count) / previousCount) * 100 : 0;
                        const percentageOfTotal = (step.count / maxCount) * 100;
                        
                        return (
                            <div key={step.id} className="relative w-full">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-slate-900">{step.count.toLocaleString()}</span>
                                        {idx > 0 && <span className="ml-2 text-xs text-slate-500">(-{dropoff.toFixed(1)}%)</span>}
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
