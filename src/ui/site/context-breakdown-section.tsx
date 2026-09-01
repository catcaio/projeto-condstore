'use client';

import React from 'react';
import { MessageSquare, Table, Truck, AlertCircle, HelpCircle, UserX, ArrowRight, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const brokenSteps = [
    { label: 'WhatsApp', icon: MessageSquare, detail: 'Cliente pede cotação rápida' },
    { label: 'Planilha', icon: Table, detail: 'Operador busca preço do item' },
    { label: 'Site Transportadora', icon: Truck, detail: 'Calcula frete manualmente' },
    { label: 'WhatsApp', icon: MessageSquare, detail: 'Retorna pro cliente (já esperou 15 min)' },
    { label: 'Ajuste do Cliente', icon: AlertCircle, detail: 'Cliente altera a quantidade' },
    { label: 'Refaz tudo', icon: UserX, detail: 'Zigue-zague recomeça do zero' },
    { label: 'Sem Histórico', icon: HelpCircle, detail: 'Outro operador não sabe o que foi combinado' },
];

export function ContextBreakdownSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.2)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-3">
                        A Dor da Operação Tradicional
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        O problema não é trabalhar muito. É trabalhar espalhado.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Quando a conversa, a cotação e o pedido vivem em abas separadas, o contexto se quebra a cada troca de janela. O cliente espera, a margem cai e a equipe se desgasta.
                    </p>
                </div>

                {/* Broken Flow Visualization */}
                <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[hsl(var(--ui-border)/0.4)]">
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-danger)/0.9)] flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-[hsl(var(--ui-danger))]" />
                                O Zigue-Zague que destrói a produtividade
                            </span>
                            <span className="text-xs text-[hsl(var(--ui-text-subtle))] font-mono">
                                ~25 a 40 minutos gastos por pedido
                            </span>
                        </div>

                        {/* Interactive Steps Grid with Broken Connectors */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {brokenSteps.map((step, idx) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={idx}
                                        className="relative p-4 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface-elevated)/0.3)] flex flex-col justify-between"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-mono font-bold text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-muted)/0.5)] px-2 py-0.5 rounded">
                                                Passo 0{idx + 1}
                                            </span>
                                            <Icon className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">{step.label}</h3>
                                            <p className="mt-1 text-xs text-[hsl(var(--ui-text-muted))] leading-normal">{step.detail}</p>
                                        </div>

                                        {idx < brokenSteps.length - 1 && (
                                            <div className="mt-4 pt-2 border-t border-dashed border-[hsl(var(--ui-border-strong)/0.5)] flex items-center justify-between text-[10px] text-[hsl(var(--ui-danger)/0.8)] font-medium">
                                                <span>Troca de aba / contexto</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 p-4 rounded-xl border border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.03)] text-xs text-[hsl(var(--ui-text-muted))] flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p>
                                <strong className="text-[hsl(var(--ui-text))]">Consequência imediata:</strong> O conhecimento fica preso na cabeça do operador e cada erro custa frete, retrabalho e insatisfação do cliente.
                            </p>
                            <span className="shrink-0 text-[11px] font-semibold text-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger)/0.1)] px-3 py-1 rounded-full border border-[hsl(var(--ui-danger)/0.2)]">
                                Fio da meada perdido
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
