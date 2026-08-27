'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    MessageSquare,
    UserCheck,
    Repeat,
    FileText,
    ShoppingBag,
    Truck,
    ShieldCheck,
    ChevronRight,
    ArrowRight,
    CheckCircle2,
    Lock,
    RefreshCw,
} from 'lucide-react';

interface Step {
    id: string;
    label: string;
    stepNumber: string;
    shortTitle: string;
    icon: React.ElementType;
    badge: string;
}

const steps: Step[] = [
    {
        id: 'canal',
        label: '1. Canal',
        stepNumber: '01',
        shortTitle: 'Canal de Entrada',
        icon: MessageSquare,
        badge: 'WhatsApp / E-mail / Marketplace',
    },
    {
        id: 'identidade',
        label: '2. Identidade',
        stepNumber: '02',
        shortTitle: 'Identidade Resolvida',
        icon: UserCheck,
        badge: 'Isolamento por Cliente',
    },
    {
        id: 'negociacao',
        label: '3. Negociação',
        stepNumber: '03',
        shortTitle: 'Negociação Contínua',
        icon: Repeat,
        badge: 'Sem Perda de Contexto',
    },
    {
        id: 'proposta',
        label: '4. Proposta',
        stepNumber: '04',
        shortTitle: 'Proposta Revisável',
        icon: FileText,
        badge: 'Histórico v1 → v2 → v3',
    },
    {
        id: 'pedido',
        label: '5. Pedido',
        stepNumber: '05',
        shortTitle: 'Pedido Gerado',
        icon: ShoppingBag,
        badge: 'Conversão Rastreada',
    },
    {
        id: 'logistica',
        label: '6. Logística',
        stepNumber: '06',
        shortTitle: 'Execução & Frete',
        icon: Truck,
        badge: 'Transportadora & Rastreio',
    },
    {
        id: 'frank',
        label: '7. Frank AI',
        stepNumber: '07',
        shortTitle: 'Frank Supervisionado',
        icon: ShieldCheck,
        badge: 'Gate Humano Obrigatório',
    },
];

export function AgilizapInteractiveFlow() {
    const [activeIdx, setActiveIdx] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<'v1' | 'v2' | 'v3'>('v3');
    const [frankGateStatus, setFrankGateStatus] = useState<'pending' | 'approved'>('pending');

    useEffect(() => {
        if (!autoPlay) return;
        const timer = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % steps.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [autoPlay]);

    const activeStep = steps[activeIdx];

    return (
        <div className="w-full max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-[#0B0E13] text-slate-100 shadow-2xl overflow-hidden font-body">
            {/* Top Bar / Control Panel Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/50" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
                        <span className="w-3 h-3 rounded-full bg-[#17C964]/30 border border-[#17C964]/50" />
                    </div>
                    <span className="text-xs font-mono font-medium tracking-wider text-slate-400">
                        PROVA VIVA :: FLUXO COMERCIAL CONTINUO AGILIZAP
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] transition-colors border",
                            autoPlay
                                ? "bg-[#3E5CFF]/15 text-[#3E5CFF] border-[#3E5CFF]/40"
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                        )}
                    >
                        <RefreshCw className={cn("w-3 h-3", autoPlay && "animate-spin")} />
                        {autoPlay ? "Auto-play Ativo" : "Auto-play Pausado"}
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                        {activeIdx + 1}/{steps.length}
                    </span>
                </div>
            </div>

            {/* Steps Navigation Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 border-b border-slate-800 bg-slate-900/40">
                {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx === activeIdx;
                    return (
                        <button
                            key={step.id}
                            onClick={() => {
                                setActiveIdx(idx);
                                setAutoPlay(false);
                            }}
                            className={cn(
                                "flex flex-col items-start p-3 text-left transition-all relative border-b-2 sm:border-b-0 sm:border-r border-slate-800/60 last:border-r-0",
                                isActive
                                    ? "bg-[#3E5CFF]/10 text-white border-b-[#3E5CFF] sm:border-b-0"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                            )}
                        >
                            {isActive && (
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#3E5CFF]" />
                            )}
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded", isActive ? "bg-[#3E5CFF] text-white" : "bg-slate-800 text-slate-400")}>
                                    {step.stepNumber}
                                </span>
                                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#3E5CFF]" : "text-slate-400")} />
                            </div>
                            <span className="text-xs font-semibold font-headline truncate w-full">
                                {step.shortTitle}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main Interactive Stage Display */}
            <div className="p-6 md:p-8 min-h-[380px] flex flex-col justify-between bg-gradient-to-b from-[#0B0E13] to-slate-950">
                {/* Stage Header Info */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#3E5CFF]/10 text-[#3E5CFF] border border-[#3E5CFF]/30">
                            <activeStep.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#3E5CFF]">
                                    Etapa {activeStep.stepNumber}
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs font-mono text-slate-400">
                                    {activeStep.badge}
                                </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold font-headline text-white mt-0.5">
                                {activeStep.shortTitle}
                            </h3>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-[#17C964] animate-pulse" />
                        <span>ESTADO :: ATIVO</span>
                    </div>
                </div>

                {/* Stage Dynamic Content View */}
                <div className="my-6">
                    {activeStep.id === 'canal' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                                    <span className="flex items-center gap-2 text-slate-300">
                                        <MessageSquare className="w-4 h-4 text-[#3E5CFF]" />
                                        WhatsApp Business • Origem Externa
                                    </span>
                                    <span>Hoje, 14:02</span>
                                </div>
                                <p className="text-sm text-slate-200 leading-relaxed font-body">
                                    "Olá! Gostaria de cotar 50 unidades do Kit Industrial com entrega para o CEP 80010-000 (Curitiba/PR). Preciso de orçamento com frete expresso."
                                </p>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Cliente: Construtora Horizonte</span>
                                    <span className="px-2 py-0.5 rounded bg-[#17C964]/10 text-[#17C964] border border-[#17C964]/30 font-semibold">STATUS :: CONTEXTO CAPTURADO</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; O AGILIZAP registra a entrada sem isolar o contato em um chat solto. A mensagem inicial aciona a resolução de identidade comercial.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'identidade' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full bg-[#3E5CFF]/20 text-[#3E5CFF] flex items-center justify-center font-bold font-mono text-sm">
                                            CH
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold font-headline text-white">Construtora Horizonte LTDA</h4>
                                            <p className="text-xs font-mono text-slate-400">CNPJ: 12.345.678/0001-90 • Curitiba/PR</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-[#17C964]/15 text-[#17C964] border border-[#17C964]/30 font-mono text-xs font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        IDENTIDADE RESOLVIDA
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                                        <span className="text-slate-500 block">Histórico de Canais</span>
                                        <span className="text-slate-200 font-medium">WhatsApp + E-mail Institucional</span>
                                    </div>
                                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                                        <span className="text-slate-500 block">Condição Cadastrada</span>
                                        <span className="text-slate-200 font-medium">Faturamento 28 dias • Tabela B2B</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; Nenhuma conversa recomeça do zero. O comprador é reconhecido independente do telefone, e-mail ou operador atendente.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'negociacao' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                                    <span className="text-slate-300 font-semibold">Linha do Tempo Comercial (Troca de Canal Ativa)</span>
                                    <span className="text-[#3E5CFF] font-bold">FLUXO CONTINUO</span>
                                </div>

                                <div className="space-y-2 font-mono text-xs">
                                    <div className="flex items-start gap-3 p-2 rounded bg-slate-950 border border-slate-800/60">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">14:02 • WhatsApp</span>
                                        <span className="text-slate-300">Cliente solicitou cotação de 50 kits para Curitiba/PR.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 rounded bg-slate-950 border border-slate-800/60">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">14:45 • E-mail</span>
                                        <span className="text-slate-300">Cliente reabriu por e-mail pedindo desconto no lote de 50 unidades.</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 rounded bg-[#3E5CFF]/10 border border-[#3E5CFF]/30">
                                        <span className="px-1.5 py-0.5 rounded bg-[#3E5CFF] text-white text-[10px]">15:10 • WhatsApp</span>
                                        <span className="text-white font-medium">Conversa reaberta no WhatsApp mantendo o contexto do desconto solicitado por e-mail.</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; O cliente pode reabrir a conversa dias depois ou mudar de canal: os termos e o contexto da negociação permanecem vivos.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'proposta' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                                        Revisões de Proposta Comercial
                                    </span>
                                    <div className="flex gap-1.5 font-mono text-xs">
                                        {(['v1', 'v2', 'v3'] as const).map((ver) => (
                                            <button
                                                key={ver}
                                                onClick={() => setSelectedVersion(ver)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded font-bold transition-colors",
                                                    selectedVersion === ver
                                                        ? "bg-[#3E5CFF] text-white"
                                                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                                                )}
                                            >
                                                {ver.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                                    {selectedVersion === 'v1' && (
                                        <>
                                            <div className="flex justify-between text-slate-400">
                                                <span>PROPOSTA v1 (14:10)</span>
                                                <span className="text-amber-400">SUBSTITUÍDA</span>
                                            </div>
                                            <p className="text-slate-300">50x Kit Industrial • Valor Unitário: R$ 250,00 • Frete: R$ 800,00</p>
                                            <div className="text-right font-bold text-white">Total: R$ 13.300,00</div>
                                        </>
                                    )}
                                    {selectedVersion === 'v2' && (
                                        <>
                                            <div className="flex justify-between text-slate-400">
                                                <span>PROPOSTA v2 (15:30)</span>
                                                <span className="text-amber-400">SUBSTITUÍDA</span>
                                            </div>
                                            <p className="text-slate-300">50x Kit Industrial • Desc. Comercial (-5%) • Frete: R$ 650,00</p>
                                            <div className="text-right font-bold text-white">Total: R$ 12.525,00</div>
                                        </>
                                    )}
                                    {selectedVersion === 'v3' && (
                                        <>
                                            <div className="flex justify-between text-slate-300">
                                                <span className="font-bold text-[#3E5CFF]">PROPOSTA v3 ATIVA (16:05)</span>
                                                <span className="px-2 py-0.5 rounded bg-[#17C964]/20 text-[#17C964] font-bold">ACEITA PELO CLIENTE</span>
                                            </div>
                                            <p className="text-slate-200">50x Kit Industrial • Condição Especial B2B • Frete Grátis Promocional</p>
                                            <div className="text-right font-bold text-[#17C964] text-sm">Total Final: R$ 11.875,00</div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; Historico de propostas v1, v2 e v3 sem perder valores nem justificativas de alteração.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'pedido' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-[#17C964]" />
                                        <span className="font-mono text-sm font-bold text-white">PEDIDO #AGZ-8942</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-[#17C964]/15 text-[#17C964] border border-[#17C964]/30 font-mono text-xs font-semibold">
                                        CONVERTIDO DE PROPOSTA v3
                                    </span>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Cliente: Construtora Horizonte LTDA</span>
                                        <span>Data: 27/08/2026</span>
                                    </div>
                                    <div className="flex justify-between text-slate-200 font-medium">
                                        <span>50x Kit Industrial (Cód. KIT-IND-50)</span>
                                        <span>R$ 11.875,00</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                                        <span>Pagamento: Faturamento 28d (Aprovado)</span>
                                        <span className="text-[#17C964] font-bold">PRONTO PARA EXECUÇÃO</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; O pedido nasce diretamente da negociação aprovada, zerando o risco de erro de digitação manual ou divergência de valor.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'logistica' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
                                <div className="flex items-center justify-between font-mono text-xs">
                                    <span className="flex items-center gap-2 text-slate-200 font-bold">
                                        <Truck className="w-4 h-4 text-[#3E5CFF]" />
                                        EXECUÇÃO LOGÍSTICA & SHIPMENT
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-[#17C964]/15 text-[#17C964] font-bold">
                                        RASTREIO ATIVO
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 block">Transportadora</span>
                                        <span className="text-slate-200 font-semibold">Jadlog Expresso</span>
                                    </div>
                                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 block">Prazo Estimado</span>
                                        <span className="text-slate-200 font-semibold">2 Dias Úteis</span>
                                    </div>
                                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                                        <span className="text-slate-500 block">Código Rastreio</span>
                                        <span className="text-[#3E5CFF] font-semibold">#TRK-983411</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; Cotação, emissão de frete e envio de código de rastreio conectados diretamente ao pedido de origem.
                            </p>
                        </div>
                    )}

                    {activeStep.id === 'frank' && (
                        <div className="space-y-4 max-w-2xl">
                            <div className="p-4 rounded-xl border border-[#3E5CFF]/40 bg-slate-900/90 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-[#3E5CFF]" />
                                        <span className="font-mono text-sm font-bold text-white">FRANK — COPILOTO SUPERVISIONADO</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" />
                                        APROVAÇÃO HUMANA OBRIGATÓRIA
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                                    <p className="text-slate-300 leading-relaxed font-body text-xs">
                                        "Frank identificou possibilidade de re-roteamento logístico para reduzir o prazo em 24h. Ação classificada como risco operacional."
                                    </p>
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                                        <span className="text-slate-400 text-[11px]">
                                            Status: {frankGateStatus === 'pending' ? 'Aguardando Validação do Operador' : 'Aprovado pelo Operador (Auditado)'}
                                        </span>
                                        {frankGateStatus === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setFrankGateStatus('approved')}
                                                    className="px-3 py-1.5 rounded-lg bg-[#17C964] text-slate-950 font-bold hover:bg-[#17C964]/90 transition-colors"
                                                >
                                                    [ Aprovar Alteração ]
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1.5 rounded-lg bg-[#17C964]/20 text-[#17C964] border border-[#17C964]/40 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> Ação Confirmada por Operador
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">
                                &gt; Frank nunca decide sozinho em ações financeiras ou de alteração de pedido. O operador mantém 100% de controle sobre a execução.
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation Footer Controls inside Component */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800 font-mono text-xs">
                    <button
                        onClick={() => {
                            setActiveIdx((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
                            setAutoPlay(false);
                        }}
                        className="px-3 py-1.5 rounded border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                    >
                        &larr; Etapa Anterior
                    </button>

                    <span className="text-slate-500 hidden sm:inline-block">
                        Clique em qualquer etapa acima para navegar
                    </span>

                    <button
                        onClick={() => {
                            setActiveIdx((prev) => (prev + 1) % steps.length);
                            setAutoPlay(false);
                        }}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded bg-[#3E5CFF] text-white font-semibold hover:bg-[#3E5CFF]/90 transition-colors"
                    >
                        <span>Próxima Etapa</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
