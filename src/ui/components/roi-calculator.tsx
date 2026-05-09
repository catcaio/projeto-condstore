'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/ui/components/button';
import { TrackedLink, SectionTracker, trackEvent } from '@/ui/lib/track-client';

export function calculateRoi(volume: number, ticket: number, whatsappCv: number, custoFrete: number) {
    const economiaOperacional = volume * custoFrete;
    const aumentoConversao = Math.round(volume * ticket * (whatsappCv / 100));
    return {
        economiaOperacional,
        aumentoConversao,
        totalRecuperado: economiaOperacional + aumentoConversao
    };
}

export function RoiCalculator() {
    const [volume, setVolume] = useState<number>(500);
    const [ticket, setTicket] = useState<number>(150);
    const [whatsappCv, setWhatsappCv] = useState<number>(5);
    const [custoFrete, setCustoFrete] = useState<number>(3.50);

    const { economiaOperacional, aumentoConversao, totalRecuperado } = calculateRoi(volume, ticket, whatsappCv, custoFrete);

    useEffect(() => {
        const handler = setTimeout(() => {
            trackEvent({
                type: 'roi_change',
                page: 'pricing',
                section: 'roi',
                element: 'calculator',
                metadata: { volume, ticket, whatsappCv, custoFrete, totalRecuperado }
            });
        }, 1000);
        return () => clearTimeout(handler);
    }, [volume, ticket, whatsappCv, custoFrete, totalRecuperado]);

    return (
        <div id="simular-roi" className="w-full max-w-4xl mx-auto mb-20 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-soft)] relative">
            <SectionTracker page="pricing" section="roi" />
            <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-[hsl(var(--ui-text))] mb-2">Simulação de Eficiência Operacional</h2>
                <p className="text-[hsl(var(--ui-text-muted))]">Estimativa baseada em volume e tempo de resposta. Resultados variam por operação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[hsl(var(--ui-text))] mb-2">
                            Volume médio mensal de pedidos
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-bg))] focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue))] outline-none transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[hsl(var(--ui-text))] mb-2">
                            Ticket médio (R$)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={ticket}
                            onChange={(e) => setTicket(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-bg))] focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue))] outline-none transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[hsl(var(--ui-text))] mb-2">
                            % de conversões via WhatsApp
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={whatsappCv}
                            onChange={(e) => setWhatsappCv(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-bg))] focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue))] outline-none transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[hsl(var(--ui-text))] mb-2">
                            Custo médio por frete manual (R$)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={custoFrete}
                            onChange={(e) => setCustoFrete(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-bg))] focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue))] outline-none transition-shadow"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-[hsl(var(--ui-surface-elevated))] rounded-[var(--radius-card)] p-8 border border-[hsl(var(--ui-border)/0.5)]">
                    <p className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] mb-4 text-center uppercase tracking-wider">Potencial de Recuperação Estimado</p>
                    <div className="text-4xl lg:text-5xl font-extrabold text-[hsl(var(--ui-accent-blue))] mb-8 text-center tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalRecuperado)}
                        <span className="text-xl font-medium text-[hsl(var(--ui-text-muted))] ml-1">/mês</span>
                    </div>

                    <div className="w-full space-y-4 mb-8">
                        <div className="flex justify-between text-sm py-2 border-b border-[hsl(var(--ui-border)/0.5)]">
                            <span className="text-[hsl(var(--ui-text-muted))]">Estimativa de economia:</span>
                            <span className="font-semibold text-[hsl(var(--ui-success))]">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(economiaOperacional)}</span>
                        </div>
                        <div className="flex justify-between text-sm py-2">
                            <span className="text-[hsl(var(--ui-text-muted))]">Melhoria de conversão:</span>
                            <span className="font-semibold text-[hsl(var(--ui-success))]">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aumentoConversao)}</span>
                        </div>
                    </div>

                    <TrackedLink href="/piloto" passHref trackPage="pricing" trackSection="roi" trackElement="roi_primary" className="w-full mt-auto" legacyBehavior>
                        <Button variant="primary" size="lg" className="w-full shadow-[var(--shadow-soft)] font-bold text-base">
                            Solicitar Avaliação Operacional
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </div>
    );
}
