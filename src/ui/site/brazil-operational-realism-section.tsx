'use client';

import React from 'react';
import { Flag, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

const BRAZIL_REALITIES = [
    { title: 'Vendas Recorrentes por WhatsApp', desc: 'Negociações B2B brasileiras dependem do atendimento humanizado no WhatsApp.' },
    { title: 'Logística Rodoviária Complexa', desc: 'Diversidade de prazos, fretes e modalidades das transportadoras brasileiras.' },
    { title: 'Equipes Enxutas e Ágeis', desc: 'Operações de 2 a 20 pessoas onde cada operador precisa produzir sem sobrecarga.' },
    { title: 'Sistemas Legados & ERPs Locais', desc: 'Conectividade transparente com a realidade tecnológica do mercado nacional.' },
];

export function BrazilOperationalRealismSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.2)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold text-[hsl(var(--ui-text))] mb-3">
                        <Flag className="h-3.5 w-3.5 text-[hsl(var(--ui-text))]" />
                        <span>Feito para o Brasil</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Tecnologia moderna para a realidade de quem faz negócio no Brasil.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Não aplicamos conceitos de SaaS importados que ignoram a dinâmica real de atendimento e frete no mercado nacional. O CONDSTORE OS nasceu no chão da operação brasileira.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                    {BRAZIL_REALITIES.map((real, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] space-y-2"
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--ui-text))]">
                                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                                <h3>{real.title}</h3>
                            </div>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{real.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
