'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Zap, ArrowUpRight, Eye, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOMENTS = [
    {
        num: '01',
        title: 'Converse',
        headline: 'A conversa continua sendo o centro.',
        desc: 'O WhatsApp é a porta de entrada da sua empresa. O CONDSTORE OS não força seu operador a abandonar o chat para gerenciar a venda.',
        icon: MessageSquare,
        demo: {
            headline: 'Centralização Sem Perda de Identidade',
            detail: 'Atendimento via WhatsApp Web/API integrado com histórico do cliente, fila por responsável e priorização em tempo real.',
            tags: ['Múltiplos Operadores', 'Histórico Unificado', 'Sem Queda de Conexão'],
        },
    },
    {
        num: '02',
        title: 'Resolva',
        headline: 'Informações e ações aparecem no contexto.',
        desc: 'Consultar preços, verificar disponibilidade e calcular frete acontecem dentro da própria janela de conversa, sem abrir planilhas.',
        icon: Zap,
        demo: {
            headline: 'Assistência Invisível no Fluxo',
            detail: 'Frank e as integrações preparam a cotação de frete e sugestões de itens enquanto o operador digita.',
            tags: ['Cotação Instantânea', 'Frank Copiloto', 'Consulta Automática'],
        },
    },
    {
        num: '03',
        title: 'Avance',
        headline: 'Cotação, pedido e logística continuam o fluxo.',
        desc: 'Com um clique, a negociação aceita pelo cliente vira pedido formalizado e segue para expedição com rastreamento ativo.',
        icon: ArrowUpRight,
        demo: {
            headline: 'Do Aceito à Expedição',
            detail: 'Transformação de cotação aprovada em pedido com validação humana (Supervisionado) e emissão de status operacional.',
            tags: ['Aprovação em 1 Clique', 'Pedido Estruturado', 'Handoff Seguro'],
        },
    },
    {
        num: '04',
        title: 'Acompanhe',
        headline: 'Operador e gestor sabem o que está acontecendo.',
        desc: 'Cockpit diário com visibilidade em tempo real sobre SLAs de resposta, atrasos de entrega e pendências comerciais.',
        icon: Eye,
        demo: {
            headline: 'Governança Operacional Transparente',
            detail: 'Paineis de exceção, fila de prioridade e visibilidade completa para o dono e os operadores.',
            tags: ['Cockpit em Tempo Real', 'Gestão de Exceções', 'Métricas de SLA'],
        },
    },
    {
        num: '05',
        title: 'Evolua',
        headline: 'A operação ganha capacidade conforme amadurece.',
        desc: 'O sistema aprende os padrões da sua empresa e sugere melhorias contínuas no processo de atendimento e frete.',
        icon: TrendingUp,
        demo: {
            headline: 'Capacidade Operacional Escalável',
            detail: 'Sua equipe atende mais clientes e processa mais pedidos sem precisar multiplicar os custos fixos.',
            tags: ['Aumento de Capacidade', 'Menos Erro Manual', 'Escala Sustentável'],
        },
    },
];

export function FiveMomentsSection() {
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const activeMoment = MOMENTS[selectedIdx];

    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-subtle))] mb-3">
                        Como Funciona
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        5 momentos para uma operação sem atrito
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        Esqueça grades com dezenas de módulos desconectados. O CONDSTORE OS organiza seu dia a dia em cinco etapas contínuas.
                    </p>
                </div>

                {/* Moments Selector Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    {MOMENTS.map((moment, idx) => {
                        const Icon = moment.icon;
                        const isSelected = selectedIdx === idx;
                        return (
                            <button
                                key={moment.num}
                                onClick={() => setSelectedIdx(idx)}
                                className={cn(
                                    'p-4 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[110px]',
                                    isSelected
                                        ? 'border-[hsl(var(--ui-text))] bg-[hsl(var(--ui-surface-elevated))] shadow-md'
                                        : 'border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] hover:border-[hsl(var(--ui-border-strong))]'
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        'text-xs font-mono font-bold',
                                        isSelected ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]'
                                    )}>
                                        {moment.num}
                                    </span>
                                    <Icon className={cn('h-4 w-4', isSelected ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]')} />
                                </div>
                                <span className={cn(
                                    'text-sm font-bold mt-3',
                                    isSelected ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-muted))]'
                                )}>
                                    {moment.title}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Active Moment Display Card */}
                <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface))] p-6 sm:p-10 shadow-lg">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeMoment.num}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.25 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                        >
                            <div className="lg:col-span-6 space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--ui-muted)/0.6)] text-xs font-mono text-[hsl(var(--ui-text))] font-bold">
                                    <span>MOMENTO {activeMoment.num}</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--ui-text))] leading-tight">
                                    {activeMoment.headline}
                                </h3>
                                <p className="text-sm sm:text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                    {activeMoment.desc}
                                </p>
                            </div>

                            <div className="lg:col-span-6 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface-elevated))] p-6 space-y-4">
                                <h4 className="text-base font-bold text-[hsl(var(--ui-text))]">
                                    {activeMoment.demo.headline}
                                </h4>
                                <p className="text-xs sm:text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                    {activeMoment.demo.detail}
                                </p>

                                <div className="pt-3 border-t border-[hsl(var(--ui-border)/0.4)] flex flex-wrap gap-2">
                                    {activeMoment.demo.tags.map((tag, tIdx) => (
                                        <span
                                            key={tIdx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.4)] text-xs text-[hsl(var(--ui-text))] font-medium"
                                        >
                                            <CheckCircle2 className="h-3 w-3 text-[hsl(var(--ui-success))]" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
