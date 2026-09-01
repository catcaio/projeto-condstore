'use client';

import React from 'react';
import { ArrowDown, TrendingUp, CheckCircle2 } from 'lucide-react';

const EVOLUTION_STAGES = [
    {
        stage: '01',
        title: 'Hoje (Operação Tradicional)',
        desc: 'WhatsApp solto + planilhas paralelas + consultas manuais em transportadoras. A equipe trabalha muito, mas perde o contexto.',
        badge: 'Situação Atual',
        highlight: false,
    },
    {
        stage: '02',
        title: 'Primeiro Passo (Contexto na Conversa)',
        desc: 'Conexão do WhatsApp com a base de dados. O operador enxerga o cliente, o histórico e os produtos sem sair do chat.',
        badge: 'Ganho Immediato',
        highlight: false,
    },
    {
        stage: '03',
        title: 'Depois (Processos Conectados)',
        desc: 'Fretes e pedidos vinculados diretamente às conversas. Validação em 1 clique e handoff fluido para expedição.',
        badge: 'Eficiência Operacional',
        highlight: false,
    },
    {
        stage: '04',
        title: 'Resultado (Operação Aumentada)',
        desc: 'Sua equipe multiplica a capacidade de atendimento com tranquilidade, clareza de dados e margem sob controle.',
        badge: 'CONDSTORE OS Pleno',
        highlight: true,
    },
];

export function OperationEvolutionSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-3">
                        Evolução Gradual
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Você não precisa virar a empresa do avesso para começar.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        O CONDSTORE OS evolui junto com a sua operação. Comece resolvendo o atrito no WhatsApp e avance conforme seu time ganha maturidade.
                    </p>
                </div>

                {/* Evolution Staircase / Progression View */}
                <div className="max-w-4xl mx-auto space-y-4">
                    {EVOLUTION_STAGES.map((item, idx) => (
                        <React.Fragment key={item.stage}>
                            <div
                                className={`rounded-2xl border p-6 sm:p-8 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
                                    item.highlight
                                        ? 'border-[hsl(var(--ui-text))] bg-[hsl(var(--ui-surface-elevated))] shadow-lg'
                                        : 'border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface)/0.5)]'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                                        item.highlight
                                            ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-page))]'
                                            : 'bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text))]'
                                    }`}>
                                        {item.stage}
                                    </span>

                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-base sm:text-lg font-extrabold text-[hsl(var(--ui-text))]">
                                                {item.title}
                                            </h3>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[hsl(var(--ui-border-strong))] text-[hsl(var(--ui-text-subtle))]">
                                                {item.badge}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs sm:text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>

                                {item.highlight && (
                                    <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-[hsl(var(--ui-success))] bg-[hsl(var(--ui-success)/0.1)] px-3.5 py-2 rounded-xl border border-[hsl(var(--ui-success)/0.2)]">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>+Capacidade com a mesma equipe</span>
                                    </div>
                                )}
                            </div>

                            {idx < EVOLUTION_STAGES.length - 1 && (
                                <div className="flex justify-center my-1">
                                    <ArrowDown className="h-4 w-4 text-[hsl(var(--ui-text-subtle))] opacity-40" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
}
