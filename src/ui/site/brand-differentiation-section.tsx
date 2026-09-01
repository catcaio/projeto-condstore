'use client';

import React from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    {
        name: 'WhatsApp + Planilha',
        headline: 'Funciona até a operação crescer',
        verdict: 'Desgaste operacional rápido',
        isTarget: false,
        points: [
            { text: 'Conexão direta com cliente', positive: true },
            { text: 'Histórico unificado no contexto', positive: false },
            { text: 'Cotações de frete automáticas', positive: false },
            { text: 'Governança e rastreabilidade', positive: false },
        ],
    },
    {
        name: 'CRM Tradicional',
        headline: 'Organiza o funil de vendas',
        verdict: 'Separa negociação da operação',
        isTarget: false,
        points: [
            { text: 'Gestão de pipeline de vendas', positive: true },
            { text: 'Histórico unificado no contexto', positive: false },
            { text: 'Integração real com transportadoras', positive: false },
            { text: 'Continuidade de pedido e entrega', positive: false },
        ],
    },
    {
        name: 'Chatbot Autônomo',
        headline: 'Respostas pré-programadas',
        verdict: 'Relacionamento B2B engessado',
        isTarget: false,
        points: [
            { text: 'Atendimento 24/7 para dúvidas simples', positive: true },
            { text: 'Flexibilidade de negociação B2B', positive: false },
            { text: 'Supervisão do operador em tempo real', positive: false },
            { text: 'Contexto de frete e cotação customizada', positive: false },
        ],
    },
    {
        name: 'CONDSTORE OS',
        headline: 'Cockpit operacional unificado',
        verdict: 'Continuidade da conversa ao caminhão',
        isTarget: true,
        points: [
            { text: 'WhatsApp como centro da operação', positive: true },
            { text: 'Cotação de frete no mesmo contexto', positive: true },
            { text: 'Transformação de cotação em pedido em 1 clique', positive: true },
            { text: 'Decisão humana com copiloto Frank', positive: true },
        ],
    },
];

export function BrandDifferentiationSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-3">
                        Espaço Único de Mercado
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Nem só CRM. Nem só frete. O cockpit da sua operação.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Enquanto as ferramentas tradicionais focam em gerenciar o funil ou apenas emitir etiquetas de envio, o CONDSTORE OS conecta o atendimento à execução sem fricção.
                    </p>
                </div>

                {/* Elegant Comparison Matrix Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CATEGORIES.map((cat, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                'rounded-2xl border p-6 flex flex-col justify-between transition-all relative',
                                cat.isTarget
                                    ? 'border-[hsl(var(--ui-text))] bg-[hsl(var(--ui-surface-elevated))] shadow-xl ring-1 ring-[hsl(var(--ui-text))]'
                                    : 'border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface)/0.4)]'
                            )}
                        >
                            {cat.isTarget && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[hsl(var(--ui-text))] text-[10px] font-bold text-[hsl(var(--ui-page))] uppercase tracking-wider">
                                    O Nosso Território
                                </span>
                            )}

                            <div>
                                <h3 className="text-base font-extrabold text-[hsl(var(--ui-text))]">{cat.name}</h3>
                                <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-0.5">{cat.headline}</p>

                                <div className="my-4 pt-3 border-t border-[hsl(var(--ui-border)/0.3)] space-y-2.5">
                                    {cat.points.map((pt, pIdx) => (
                                        <div key={pIdx} className="flex items-start gap-2 text-xs">
                                            {pt.positive ? (
                                                <Check className="h-3.5 w-3.5 text-[hsl(var(--ui-success))] mt-0.5 shrink-0" />
                                            ) : (
                                                <X className="h-3.5 w-3.5 text-[hsl(var(--ui-text-subtle))] opacity-40 mt-0.5 shrink-0" />
                                            )}
                                            <span className={cn(pt.positive ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]')}>
                                                {pt.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[hsl(var(--ui-border)/0.3)] text-center">
                                <span className={cn(
                                    'text-[11px] font-bold',
                                    cat.isTarget ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]'
                                )}>
                                    {cat.verdict}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
