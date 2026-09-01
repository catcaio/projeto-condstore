'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    MessageSquare,
    Calculator,
    Package,
    Truck,
    CheckCircle2,
    Shield,
    Sparkles,
    User,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage {
    id: string;
    stepNumber: string;
    title: string;
    label: string;
    badge: string;
    icon: React.ElementType;
}

const STAGES: Stage[] = [
    { id: 'chat', stepNumber: '01', title: 'Conversa no WhatsApp', label: 'WhatsApp', badge: 'Entrada da Demanda', icon: MessageSquare },
    { id: 'quote', stepNumber: '02', title: 'Cotação Assistida', label: 'Cotação', badge: 'Comparativo de Frete', icon: Calculator },
    { id: 'order', stepNumber: '03', title: 'Aprovação & Pedido', label: 'Pedido', badge: 'Validação Humana', icon: Package },
    { id: 'logistics', stepNumber: '04', title: 'Logística & Status', label: 'Acompanhamento', badge: 'Rastreio em Tempo Real', icon: Truck },
];

export function InteractiveHero() {
    const [activeStage, setActiveStage] = useState<number>(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setActiveStage((prev) => (prev + 1) % STAGES.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const handleSelectStage = (index: number) => {
        setIsAutoPlaying(false);
        setActiveStage(index);
    };

    return (
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-[hsl(var(--ui-border)/0.4)]">
            {/* Ambient Background Structure */}
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--ui-surface-elevated)/0.3)] via-[hsl(var(--ui-page))] to-[hsl(var(--ui-page))] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-[hsl(var(--ui-border)/0.15)] blur-[140px] rounded-full pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                {/* Header Content */}
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold tracking-wider uppercase text-[hsl(var(--ui-text-muted))] mb-6 backdrop-blur-sm">
                        <span className="h-2 w-2 rounded-full bg-[hsl(var(--ui-success))]" />
                        <span>Cockpit Operacional B2B • CONDSTORE OS</span>
                    </div>

                    <h1
                        data-testid="public-hero-title"
                        className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight leading-[1.12]"
                    >
                        Seu WhatsApp vira o cockpit da operação.
                    </h1>

                    <p className="mt-6 text-base sm:text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-3xl font-normal">
                        Conversa, cotação de frete, pedido e acompanhamento no mesmo fluxo continuous — para sua equipe vender mais e entregar sem perder o contexto.
                    </p>

                    {/* Primary CTAs */}
                    <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <Link
                            href="/piloto"
                            data-testid="public-primary-cta"
                            className="inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[hsl(var(--ui-text))] px-7 text-sm font-bold text-[hsl(var(--ui-page))] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]"
                        >
                            Solicitar avaliação operacional
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex h-13 w-full sm:w-auto items-center justify-center rounded-xl border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.5)] px-7 text-sm font-semibold text-[hsl(var(--ui-text))] transition-all hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]"
                        >
                            Entrar no sistema
                        </Link>
                    </div>

                    {/* Guarantees micro-copy */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[hsl(var(--ui-text-subtle))]">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--ui-success))]" />
                            Humano no controle em cada etapa
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-[hsl(var(--ui-text-muted))]" />
                            Integração limpa sem trocar de ERP
                        </span>
                    </div>
                </div>

                {/* Interactive Simulation Cockpit Demo */}
                <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
                    {/* Continuous Stage Navigation Tabs */}
                    <div className="flex flex-col sm:flex-row items-stretch justify-between gap-2 p-1.5 rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface)/0.4)] backdrop-blur-md mb-4">
                        {STAGES.map((stage, idx) => {
                            const Icon = stage.icon;
                            const isActive = activeStage === idx;

                            return (
                                <button
                                    key={stage.id}
                                    onClick={() => handleSelectStage(idx)}
                                    className={cn(
                                        'flex-1 flex items-center justify-between sm:justify-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left sm:text-center relative',
                                        isActive
                                            ? 'bg-[hsl(var(--ui-surface-elevated))] text-[hsl(var(--ui-text))] shadow-sm border border-[hsl(var(--ui-border)/0.5)]'
                                            : 'text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface)/0.3)]'
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={cn(
                                            'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-mono font-bold',
                                            isActive
                                                ? 'bg-[hsl(var(--ui-text))] text-[hsl(var(--ui-page))]'
                                                : 'bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text-subtle))]'
                                        )}>
                                            {stage.stepNumber}
                                        </span>
                                        <Icon className={cn('h-4 w-4', isActive ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]')} />
                                        <span>{stage.label}</span>
                                    </div>
                                    {idx < STAGES.length - 1 && (
                                        <ChevronRight className="hidden md:block h-3.5 w-3.5 text-[hsl(var(--ui-border-strong))] opacity-40 ml-auto" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Live Screen Simulator Window */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface))] shadow-2xl overflow-hidden">
                        {/* Frame Top Bar */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface-elevated)/0.4)] text-xs">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#FF5F56] opacity-80" />
                                <span className="h-3 w-3 rounded-full bg-[#FFBD2E] opacity-80" />
                                <span className="h-3 w-3 rounded-full bg-[#27C93F] opacity-80" />
                                <span className="ml-2 font-mono text-[11px] text-[hsl(var(--ui-text-subtle))] hidden sm:inline">
                                    CONDSTORE OS • Cockpit de Atendimento & Operação
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(var(--ui-success))] bg-[hsl(var(--ui-success)/0.1)] px-2.5 py-0.5 rounded-full border border-[hsl(var(--ui-success)/0.2)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ui-success))] animate-pulse" />
                                    Contexto Ativo
                                </span>
                                <button
                                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                                    className="p-1 rounded text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                    title={isAutoPlaying ? "Pausar demonstração" : "Reproduzir demonstração"}
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", isAutoPlaying && "animate-spin")} />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Stage View */}
                        <div className="p-4 sm:p-6 md:p-8 min-h-[360px] flex flex-col justify-between bg-gradient-to-b from-[hsl(var(--ui-surface))] to-[hsl(var(--ui-surface-elevated)/0.2)]">
                            <AnimatePresence mode="wait">
                                {activeStage === 0 && (
                                    <motion.div
                                        key="chat-stage"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--ui-border)/0.4)]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                                                    AC
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Distribuidora Alto Alfa Ltda</h3>
                                                    <p className="text-xs text-[hsl(var(--ui-text-subtle))]">+55 11 98842-1020 • Cliente Recorrente</p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text-muted))]">
                                                Atendimento #4920
                                            </span>
                                        </div>

                                        <div className="space-y-3 max-w-xl">
                                            <div className="rounded-xl p-3.5 bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] text-xs text-[hsl(var(--ui-text))] leading-relaxed">
                                                <p className="font-semibold mb-1 text-[11px] text-[hsl(var(--ui-text-subtle))]">Cliente (WhatsApp):</p>
                                                "Bom dia Carlos! Preciso cotar 50 caixas da conexao 3/4 para entregar na obra em Campinas/SP na sexta-feira. Qual o prazo e frete?"
                                            </div>

                                            <div className="rounded-xl p-3.5 bg-[hsl(var(--ui-surface)/0.8)] border border-[hsl(var(--ui-border)/0.4)] text-xs text-[hsl(var(--ui-text-muted))] flex items-start gap-3">
                                                <Sparkles className="h-4 w-4 text-[hsl(var(--ui-text))] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-[11px] text-[hsl(var(--ui-text))] mb-0.5">IA Frank (Copiloto):</p>
                                                    <p>Detectei solicitação de cotação para CEP 13010-001 (Campinas). 50 caixas = 120 kg / 0.8m³. Clicando abaixo você compara transportadoras instantaneamente.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeStage === 1 && (
                                    <motion.div
                                        key="quote-stage"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--ui-border)/0.4)]">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--ui-text))]">
                                                <Calculator className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                                <span>Comparativo de Fretes — Cotação #8831 (Campinas/SP)</span>
                                            </div>
                                            <span className="text-xs text-[hsl(var(--ui-success))] font-mono">3 transportadoras consultadas</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { name: 'Braspress Express', price: 'R$ 240,00', time: '2 dias úteis', best: false },
                                                { name: 'Jadlog Rodoviário', price: 'R$ 185,50', time: '3 dias úteis', best: true },
                                                { name: 'Transfolha Direta', price: 'R$ 310,00', time: '1 dia útil', best: false },
                                            ].map((option, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        'rounded-xl p-4 border text-xs transition-all relative',
                                                        option.best
                                                            ? 'border-[hsl(var(--ui-success))] bg-[hsl(var(--ui-success)/0.05)]'
                                                            : 'border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface-elevated))]'
                                                    )}
                                                >
                                                    {option.best && (
                                                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[hsl(var(--ui-success))] text-[9px] font-bold text-black uppercase">
                                                            Recomendado
                                                        </span>
                                                    )}
                                                    <p className="font-semibold text-[hsl(var(--ui-text))] text-sm">{option.name}</p>
                                                    <p className="text-base font-bold text-[hsl(var(--ui-text))] mt-2">{option.price}</p>
                                                    <p className="text-[11px] text-[hsl(var(--ui-text-muted))] mt-0.5">Prazo: {option.time}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-xs text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-surface-elevated)/0.5)] p-3 rounded-lg border border-[hsl(var(--ui-border)/0.3)] flex items-center justify-between">
                                            <span>Contexto da conversa preservado: O cliente receberá a proposta direta no WhatsApp com 1 clique.</span>
                                            <span className="font-mono text-[10px] text-[hsl(var(--ui-text-muted))]">Zero digitação manual</span>
                                        </div>
                                    </motion.div>
                                )}

                                {activeStage === 2 && (
                                    <motion.div
                                        key="order-stage"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--ui-border)/0.4)]">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--ui-text))]">
                                                <Package className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                                <span>Pedido #PED-2026-904 • Aprovado pelo Operador</span>
                                            </div>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                                                ACEITO (ACCEPTED)
                                            </span>
                                        </div>

                                        <div className="rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface-elevated))] p-4 space-y-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-subtle))] block">Cliente</span>
                                                    <span className="font-semibold text-[hsl(var(--ui-text))]">Distribuidora Alto Alfa</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-subtle))] block">Itens</span>
                                                    <span className="font-semibold text-[hsl(var(--ui-text))]">50x Conexão 3/4</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-subtle))] block">Frete Selecionado</span>
                                                    <span className="font-semibold text-[hsl(var(--ui-text))]">Jadlog (R$ 185,50)</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-[hsl(var(--ui-text-subtle))] block">Valor Total</span>
                                                    <span className="font-bold text-[hsl(var(--ui-text))]">R$ 4.385,50</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-[hsl(var(--ui-border)/0.3)] flex items-center justify-between text-[11px] text-[hsl(var(--ui-text-muted))]">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5 text-[hsl(var(--ui-text-subtle))]" />
                                                    Aprovado por: Carlos (Operador Comercial)
                                                </span>
                                                <span className="font-mono text-[10px]">Trilha registrada com timestamp de governança</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeStage === 3 && (
                                    <motion.div
                                        key="logistics-stage"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--ui-border)/0.4)]">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--ui-text))]">
                                                <Truck className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                                <span>Shipment Tracker • Código Rastreio #JAD-8839210-SP</span>
                                            </div>
                                            <span className="text-xs text-[hsl(var(--ui-text-muted))] font-mono">Previsão: 14/Maio 16:00</span>
                                        </div>

                                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[hsl(var(--ui-border))]">
                                            {[
                                                { title: 'Pedido Coletado na Origem', detail: 'Centro de Distribuição Principal — 08:30', done: true },
                                                { title: 'Em trânsito para filial Campinas', detail: 'Rodovia Anhanguera KM 82 — 11:45', done: true },
                                                { title: 'Previsão de Entrega na Obra', detail: 'Rua das Indústrias, 400 - Campinas/SP', done: false },
                                            ].map((step, idx) => (
                                                <div key={idx} className="relative flex items-start gap-3 text-xs">
                                                    <span className={cn(
                                                        'absolute -left-6 top-0.5 h-3.5 w-3.5 rounded-full border-2',
                                                        step.done
                                                            ? 'bg-[hsl(var(--ui-success))] border-[hsl(var(--ui-success))]'
                                                            : 'bg-[hsl(var(--ui-page))] border-[hsl(var(--ui-border-strong))]'
                                                    )} />
                                                    <div>
                                                        <p className={cn('font-semibold', step.done ? 'text-[hsl(var(--ui-text))]' : 'text-[hsl(var(--ui-text-subtle))]')}>
                                                            {step.title}
                                                        </p>
                                                        <p className="text-[11px] text-[hsl(var(--ui-text-muted))]">{step.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Bottom Context Banner */}
                            <div className="mt-6 pt-4 border-t border-[hsl(var(--ui-border)/0.4)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[hsl(var(--ui-text-muted))]">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[hsl(var(--ui-text))]">Conceito narrativo:</span>
                                    <span>Da conversa ao caminhão sem sair da mesma tela.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {STAGES.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectStage(i)}
                                            className={cn(
                                                'h-1.5 rounded-full transition-all',
                                                activeStage === i
                                                    ? 'w-6 bg-[hsl(var(--ui-text))]'
                                                    : 'w-1.5 bg-[hsl(var(--ui-border-strong))] opacity-50'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
