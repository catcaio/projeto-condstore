'use client';

import React from 'react';
import { UserCheck, Cpu, Heart, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

const HUMAN_TASKS = [
    { title: 'Relacionamento & Empatia', desc: 'Entender a real necessidade do cliente B2B e negociar termos comerciais.' },
    { title: 'Decisão & Aprovação', desc: 'Validar a cotação e aprovar o pedido final com responsabilidade.' },
    { title: 'Tratativa de Exceções', desc: 'Resolver imprevistos operacionais que exigem bom senso e sensibilidade.' },
];

const SYSTEM_TASKS = [
    { title: 'Consulta & Comparação', desc: 'Buscar preços e prazos em transportadoras em milissegundos.' },
    { title: 'Organização de Histórico', desc: 'Guardar cada detalhe da negociação no contexto do cliente.' },
    { title: 'Alertas & Lembretes', desc: 'Avisar quando um pedido precisa de atenção ou quando o SLA vai expirar.' },
    { title: 'Sugestão de Próximos Passos', desc: 'Frank prepara a informação antes do operador precisar pedir.' },
];

export function HumanCentricSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold text-[hsl(var(--ui-text))] mb-3">
                        <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-success))]" />
                        <span>Filosofia Humano no Centro</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        A tecnologia não toma o lugar de quem conhece o cliente.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Ela tira do caminho o trabalho que não precisa ocupar sua atenção. O operador continua decidindo. O sistema reduz o peso operacional ao redor da decisão.
                    </p>
                </div>

                {/* Human vs System Division Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Human Role Card */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface))] p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--ui-border)/0.4)]">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-page))] font-bold">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">O Humano (Seu Time)</h3>
                                <p className="text-xs text-[hsl(var(--ui-text-subtle))]">Foco no que gera valor comercial</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {HUMAN_TASKS.map((task, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                                    <Heart className="h-4 w-4 text-[hsl(var(--ui-text))] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-[hsl(var(--ui-text))]">{task.title}</p>
                                        <p className="text-[hsl(var(--ui-text-muted))] leading-relaxed">{task.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Role Card */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface-elevated)/0.5)] p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--ui-border)/0.4)]">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-muted)/0.7)] text-[hsl(var(--ui-text))] font-bold">
                                <Cpu className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">O Sistema (CONDSTORE OS)</h3>
                                <p className="text-xs text-[hsl(var(--ui-text-subtle))]">Trabalho invisível de bastidores</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {SYSTEM_TASKS.map((task, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                                    <Zap className="h-4 w-4 text-[hsl(var(--ui-success))] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-[hsl(var(--ui-text))]">{task.title}</p>
                                        <p className="text-[hsl(var(--ui-text-muted))] leading-relaxed">{task.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
