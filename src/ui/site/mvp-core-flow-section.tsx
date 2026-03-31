import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import {
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Lock,
    MessageSquareText,
    Route,
    Truck,
} from 'lucide-react';

interface MvpFlowStep {
    id: string;
    title: string;
    summary: string;
    detail: string;
    statusLabel: string;
    tone: 'neutral' | 'success' | 'warning' | 'danger';
    icon: ComponentType<{ className?: string }>;
}

const flowSteps: MvpFlowStep[] = [
    {
        id: '01',
        title: 'Entrada da demanda',
        summary: 'Mensagem chega via WhatsApp supervisionado.',
        detail: 'A conversa abre com cliente, histórico e contexto operacional para o operador iniciar sem retrabalho.',
        statusLabel: 'capturado',
        tone: 'neutral',
        icon: MessageSquareText,
    },
    {
        id: '02',
        title: 'Simulação e cotação',
        summary: 'Motor calcula frete e prazo com regras reais.',
        detail: 'A cotação nasce com transportadora, SLA e custo projetado para decisão comercial assistida.',
        statusLabel: 'simulado',
        tone: 'neutral',
        icon: Route,
    },
    {
        id: '03',
        title: 'Aprovação obrigatória',
        summary: 'Cliente precisa aceitar condições antes de avançar.',
        detail: 'Sem aceite explícito, o fluxo permanece em validação. A operação mantém trilha de quem aprovou e quando.',
        statusLabel: 'gate crítico',
        tone: 'warning',
        icon: ClipboardCheck,
    },
    {
        id: '04',
        title: 'Bloqueio sem aceite',
        summary: 'Conversão trava automaticamente até aprovação.',
        detail: 'Sem aprovação, não existe pedido. O sistema marca o estado como bloqueado para evitar despacho indevido.',
        statusLabel: 'bloqueado',
        tone: 'danger',
        icon: Lock,
    },
    {
        id: '05',
        title: 'Geração de pedido',
        summary: 'Aceite confirmado libera criação formal do pedido.',
        detail: 'Pedido nasce com responsável, timeline e dados comerciais consolidados para execução operacional.',
        statusLabel: 'pedido criado',
        tone: 'success',
        icon: FileText,
    },
    {
        id: '06',
        title: 'Início da logística',
        summary: 'Pedido aprovado ativa ciclo de coleta e envio.',
        detail: 'A operação passa para despacho, acompanhamento de eventos e tratamento de exceções em tempo real.',
        statusLabel: 'em logística',
        tone: 'success',
        icon: Truck,
    },
    {
        id: '07',
        title: 'Cockpit e métricas',
        summary: 'Cada evento alimenta o cockpit operacional.',
        detail: 'SLA, produtividade e backlog são atualizados como consequência natural do fluxo executado.',
        statusLabel: 'auditável',
        tone: 'success',
        icon: CheckCircle2,
    },
];

const toneClasses: Record<MvpFlowStep['tone'], string> = {
    neutral: 'border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.45)] text-[hsl(var(--ui-text))]',
    success: 'border-[hsl(var(--ui-success)/0.45)] bg-[hsl(var(--ui-success)/0.12)] text-[hsl(var(--ui-success))]',
    warning: 'border-[hsl(var(--ui-accent-blue)/0.45)] bg-[hsl(var(--ui-accent-blue)/0.11)] text-[hsl(var(--ui-accent-blue))]',
    danger: 'border-[hsl(var(--ui-danger)/0.45)] bg-[hsl(var(--ui-danger)/0.13)] text-[hsl(var(--ui-danger))]',
};

export function MvpCoreFlowSection({ className }: { className?: string }) {
    return (
        <section
            className={cn(
                'rounded-3xl border border-[hsl(var(--ui-border)/0.4)] bg-[linear-gradient(180deg,hsl(var(--ui-surface)/0.62),hsl(var(--ui-surface)/0.18))] p-4 md:p-6 lg:p-8',
                className
            )}
            aria-label="Fluxo supervisionado do MVP"
        >
            <div className="mb-6 md:mb-8 rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.68)] p-4 md:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">Fluxo auditável</p>
                <p className="mt-2 text-sm md:text-[15px] leading-relaxed text-[hsl(var(--ui-text-muted))]">
                    Demanda só vira pedido após aprovação explícita. Sem aceite, o sistema bloqueia conversão. Com aceite, logística inicia e o cockpit recebe métricas automaticamente.
                </p>
            </div>

            <ol className="space-y-3 md:space-y-4">
                {flowSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === flowSteps.length - 1;

                    return (
                        <li key={step.id} className="relative">
                            <div className="grid grid-cols-[auto_1fr] gap-3 md:gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-page)/0.78)] text-[hsl(var(--ui-text-subtle))] text-xs font-bold">
                                        {step.id}
                                    </div>
                                    {!isLast && <div className="mt-2 h-full w-px bg-[hsl(var(--ui-border)/0.45)]" />}
                                </div>

                                <article className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.6)] p-4 md:p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="h-4 w-4 md:h-[18px] md:w-[18px] text-[hsl(var(--ui-text-subtle))]" />
                                                <h3 className="text-sm md:text-base font-semibold tracking-tight text-[hsl(var(--ui-text))]">{step.title}</h3>
                                            </div>
                                            <p className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">{step.summary}</p>
                                        </div>
                                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]', toneClasses[step.tone])}>
                                            {step.statusLabel}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-xs md:text-sm leading-relaxed text-[hsl(var(--ui-text-subtle))]">{step.detail}</p>
                                </article>
                            </div>

                            {!isLast && (
                                <ArrowRight className="pointer-events-none absolute -right-0.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[hsl(var(--ui-border))] lg:block" />
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
