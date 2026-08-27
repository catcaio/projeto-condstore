'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, Clock3, MessageCircle, Package, Truck } from 'lucide-react';

const sequence = [
    { key: 'canal', label: 'WhatsApp', sub: 'contato recebido', icon: MessageCircle },
    { key: 'identidade', label: 'Cliente resolvido', sub: 'identidade reconhecida', icon: Check },
    { key: 'negociacao', label: 'Negociação', sub: 'contexto retomado', icon: MessageCircle },
    { key: 'proposta', label: 'Proposta v2', sub: 'versão preservada', icon: Package },
    { key: 'execucao', label: 'Frete + rastreio', sub: 'operação em andamento', icon: Truck },
] as const;

export function AgilizapFlowSignature() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setActive((current) => (current + 1) % sequence.length), 1800);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="relative mx-auto w-full max-w-2xl" aria-label="Demonstração do fluxo comercial contínuo">
            <div className="rounded-xl border border-white/10 bg-[#11151d] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#17C964]" /> fluxo ativo
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30"><Clock3 className="h-3 w-3" /> agora</div>
                </div>

                <div className="relative py-5 sm:py-7">
                    <div className="absolute left-[23px] top-10 bottom-10 w-px bg-white/10 sm:left-[27px]" />
                    <div className="space-y-2">
                        {sequence.map((item, index) => {
                            const Icon = item.icon;
                            const isCurrent = index === active;
                            const isDone = index < active;
                            return (
                                <div key={item.key} className={`relative flex items-center gap-4 rounded-lg border p-3 transition-all duration-500 sm:gap-5 sm:p-4 ${isCurrent ? 'border-white/15 bg-white/[0.055]' : 'border-transparent'} ${isDone ? 'opacity-55' : 'opacity-100'}`}>
                                    <div className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isDone ? 'border-[#17C964]/60 bg-[#17C964]/10 text-[#17C964]' : isCurrent ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)] text-white' : 'border-white/15 bg-[#11151d] text-white/25'}`}>
                                        {isDone ? <Check className="h-3 w-3" /> : isCurrent ? <Icon className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <p className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-white/65'}`}>{item.label}</p>
                                            <span className="font-mono text-[9px] uppercase tracking-wider text-white/25">{String(index + 1).padStart(2, '0')}</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-white/35">{item.sub}</p>
                                    </div>
                                    {isCurrent && <span className="hidden rounded-full border border-[var(--ag-accent)]/30 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#8c9cff] sm:inline-flex">contexto preservado</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/30">assinatura AGILIZAP</p>
                            <p className="mt-1 text-xs text-white/55">Uma jornada. Um contexto.</p>
                        </div>
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28" aria-hidden="true"><div className="h-full w-1/5 rounded-full bg-[var(--ag-accent)] transition-transform duration-700" style={{ transform: `translateX(${active * 100}%)` }} /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
