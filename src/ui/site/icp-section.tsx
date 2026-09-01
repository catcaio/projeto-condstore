'use client';

import React from 'react';
import { Building2, Store, Truck, Users, CheckCircle2 } from 'lucide-react';

const ICP_CARDS = [
    {
        title: 'Distribuidoras B2B',
        desc: 'Operações que comercializam volumes recorrentes por WhatsApp e demandam agilidade no cálculo de fretes rodoviários.',
        icon: Building2,
    },
    {
        title: 'Atacadistas & Revendas',
        desc: 'Empresas com mix diversificado de produtos que precisam validar pedidos rapidamente para não perder vendas.',
        icon: Store,
    },
    {
        title: 'Operações Logísticas Recorrentes',
        desc: 'Equipes comerciais de 2 a 20 operadores que movimentam de 20 a 500 pedidos por mês e buscam mais controle.',
        icon: Truck,
    },
    {
        title: 'Gestores & Operadores',
        desc: 'Feito para quem vive no dia a dia da operação e quer eliminar retrabalho sem precisar virar um especialista em TI.',
        icon: Users,
    },
];

export function ICPSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.2)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-3">
                        Para Quem É
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Feito para operações que cresceram além da planilha, mas não querem virar um projeto de TI.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Desenhado sob medida para a realidade do mercado B2B brasileiro de médio porte.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                    {ICP_CARDS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] p-6 space-y-3 transition-all hover:border-[hsl(var(--ui-border-strong))]"
                            >
                                <div className="h-10 w-10 rounded-xl bg-[hsl(var(--ui-muted)/0.6)] flex items-center justify-center text-[hsl(var(--ui-text))]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-extrabold text-[hsl(var(--ui-text))]">{item.title}</h3>
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
