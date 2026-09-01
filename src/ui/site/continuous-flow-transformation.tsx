'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, MessageSquare, Calculator, PackageCheck, Route } from 'lucide-react';

const unifiedSteps = [
    {
        title: '01. Atendimento no WhatsApp',
        desc: 'Sem sair da tela da conversa, o operador visualiza cadastro, histórico de compras e observações operacionais.',
        icon: MessageSquare,
    },
    {
        title: '02. Cotação em 1 Clique',
        desc: 'O sistema consulta as transportadoras configuradas e apresenta as melhores opções de frete direto no contexto.',
        icon: Calculator,
    },
    {
        title: '03. Validação & Pedido',
        desc: 'Com a cotação aceita pelo cliente, o operador valida e gera o pedido rastreável com autorização formal.',
        icon: PackageCheck,
    },
    {
        title: '04. Acompanhamento Contínuo',
        desc: 'Status de expedição, entrega e ocorrências alimentam o cockpit sem exigência de consultas manuais.',
        icon: Route,
    },
];

export function ContinuousFlowTransformation() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    {/* Left Copy Column */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-success)/0.3)] bg-[hsl(var(--ui-success)/0.08)] text-xs font-semibold text-[hsl(var(--ui-success))]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>A Transformação do CONDSTORE OS</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight leading-tight">
                            E se o fio não precisasse ser perdido?
                        </h2>

                        <p className="text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            No CONDSTORE OS, cada interação no WhatsApp se conecta nativamente com frete, pedido e logística. O operador não precisa ser um malabarista de abas.
                        </p>

                        <div className="space-y-3 pt-2">
                            {[
                                'Informações aparecem exatamente quando necessárias',
                                'Histórico comercial e logístico sempre visíveis',
                                'Cotação de frete calculada dentro do contexto',
                                'Sem digitação duplicada ou erros manuais',
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[hsl(var(--ui-text))]">
                                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ui-success))] mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/solucoes"
                                className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--ui-text))] hover:underline underline-offset-4"
                            >
                                Entender o fluxo operacional na prática
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Right Unified Flow Column */}
                    <div className="lg:col-span-7">
                        <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface-elevated)/0.5)] p-6 sm:p-8 space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--ui-border)/0.4)]">
                                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                    Fluxo Operacional Unificado (Sem Ruído)
                                </span>
                                <span className="text-xs font-mono text-[hsl(var(--ui-success))]">
                                    Continuidade total
                                </span>
                            </div>

                            <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[hsl(var(--ui-border-strong)/0.4)]">
                                {unifiedSteps.map((step, idx) => {
                                    const Icon = step.icon;
                                    return (
                                        <div key={idx} className="relative pl-10 group">
                                            <div className="absolute left-3 top-1 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-page))] font-mono text-[10px] font-bold">
                                                ✓
                                            </div>
                                            <div className="rounded-xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))] p-4 transition-all hover:border-[hsl(var(--ui-border-strong))]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                                    <h3 className="text-xs sm:text-sm font-semibold text-[hsl(var(--ui-text))]">
                                                        {step.title}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                                    {step.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
