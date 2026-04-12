import { cn } from '@/lib/utils';
import {
    ACTION_ENGINE_LIFECYCLE_STEPS,
    COCKPIT_METRICS_REFRESH_MS,
    DOMINE_DLQ_ATTENTION_DEPTH,
    DOMINE_PENDING_EVENT_WARNING_MS,
} from '@/modules/system-status/operational-guardrails';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    ClipboardCheck,
    FileText,
    Lock,
    MessageSquare,
    ShieldCheck,
    Users,
    Workflow,
} from 'lucide-react';
import { PageContainer } from './page-container';

type OperationProofVariant = 'compact' | 'expanded';

interface OperationProofProps {
    variant?: OperationProofVariant;
    className?: string;
}

interface TelemetrySignal {
    value: string;
    label: string;
    detail: string;
    tone: 'default' | 'blue' | 'success' | 'danger';
}

interface GuardrailItem {
    icon: LucideIcon;
    title: string;
    detail: string;
    status: string;
}

interface PerspectiveItem {
    icon: LucideIcon;
    label: string;
}

const metricsRefreshSeconds = COCKPIT_METRICS_REFRESH_MS / 1000;
const pendingEventWarningMinutes = DOMINE_PENDING_EVENT_WARNING_MS / 60_000;
const actionLifecycleLabel = ACTION_ENGINE_LIFECYCLE_STEPS.join(' → ');

const telemetrySignals: TelemetrySignal[] = [
    {
        value: `${metricsRefreshSeconds}s`,
        label: 'refresh do cockpit',
        detail: 'Mensagens, cotações e erros entram em leitura curta para operação diária.',
        tone: 'blue',
    },
    {
        value: '24h',
        label: 'janela crítica',
        detail: 'Segurança, bloqueios e erros são consolidados por período operacional real.',
        tone: 'default',
    },
    {
        value: `${pendingEventWarningMinutes} min`,
        label: 'fila sob atenção',
        detail: 'Evento pendente fora da janela aceitável acende alerta antes de virar incidente.',
        tone: 'success',
    },
    {
        value: `> ${DOMINE_DLQ_ATTENTION_DEPTH}`,
        label: 'DLQ escalada',
        detail: 'Acúmulo de falhas na fila morta vira atenção operacional explícita.',
        tone: 'danger',
    },
    {
        value: `${ACTION_ENGINE_LIFECYCLE_STEPS.length} etapas`,
        label: 'ação governada',
        detail: `Ações críticas seguem ${actionLifecycleLabel} antes de qualquer efeito.`,
        tone: 'blue',
    },
    {
        value: '0 envio',
        label: 'sem aceite',
        detail: 'Sem aprovação explícita, pedido e logística não avançam no fluxo.',
        tone: 'success',
    },
];

const guardrails: GuardrailItem[] = [
    {
        icon: ClipboardCheck,
        title: 'Aceite explícito antes do pedido',
        detail: 'Conversão trava sem aprovação do cliente. O sistema bloqueia despacho indevido por padrão.',
        status: 'obrigatório',
    },
    {
        icon: ShieldCheck,
        title: 'RBAC e isolamento por tenant',
        detail: 'Papéis, dados e permissões ficam separados por operação para escalar sem mistura de contexto.',
        status: 'nativo',
    },
    {
        icon: Activity,
        title: 'Incident mode, outbound e fila',
        detail: 'A equipe consegue conter tráfego, monitorar saúde e reagir sem sair do cockpit.',
        status: 'controlado',
    },
    {
        icon: FileText,
        title: 'Audit trail em cada mutação',
        detail: 'Ação, ator, timestamp e contexto entram na trilha operacional em vez de depender de planilha.',
        status: 'rastreável',
    },
    {
        icon: AlertTriangle,
        title: 'LGPD, rate limit e kill switch',
        detail: 'Bloqueios preventivos e proteção de borda fazem parte da operação, não de um slide.',
        status: 'protegido',
    },
];

const operatorView: PerspectiveItem[] = [
    { icon: MessageSquare, label: 'Histórico de conversa, cliente e pedido na mesma leitura.' },
    { icon: BarChart3, label: 'Cotação com custo, SLA e transportadora antes de responder.' },
    { icon: AlertTriangle, label: 'Exceções, fila e handoff visíveis em tempo real.' },
    { icon: Lock, label: 'Gate de aprovação explícita antes de converter em pedido.' },
];

const managerControls: PerspectiveItem[] = [
    { icon: ShieldCheck, label: 'Papéis por tenant e permissões granulares para cada frente.' },
    { icon: Activity, label: 'DLQ depth, evento pendente mais antigo e saúde operacional.' },
    { icon: Workflow, label: 'Incident mode, outbound toggle e trilhos de contenção.' },
    { icon: ClipboardCheck, label: 'Lifecycle propor, aprovar e executar nas ações críticas.' },
];

const handoffRail = [
    {
        icon: Workflow,
        title: 'Sistema organiza',
        detail: 'Intenção, contexto e próxima ação aparecem antes da execução.',
    },
    {
        icon: Users,
        title: 'Humano supervisiona',
        detail: 'Operador aprova, corrige ou bloqueia quando o fluxo exige decisão.',
    },
    {
        icon: FileText,
        title: 'Gestão audita',
        detail: 'Cada mudança deixa evidência rastreável para operação e governança.',
    },
];

const trackedKpis = [
    'Mensagens hoje',
    'Cotações hoje',
    'Erros críticos 24h',
];

const signalToneClasses: Record<TelemetrySignal['tone'], string> = {
    default: 'border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.72)] text-[hsl(var(--ui-text))]',
    blue: 'border-[hsl(var(--ui-accent-blue)/0.35)] bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue-ink,var(--ui-accent-blue)))]',
    success: 'border-[hsl(var(--ui-success)/0.35)] bg-[hsl(var(--ui-success)/0.09)] text-[hsl(var(--ui-success-ink,var(--ui-success)))]',
    danger: 'border-[hsl(var(--ui-danger)/0.35)] bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger))]',
};

export function OperationProof({ variant = 'expanded', className }: OperationProofProps) {
    const isCompact = variant === 'compact';
    const intro = isCompact
        ? {
            title: 'A robustez aparece no fluxo antes mesmo do login.',
            description: 'O produto já expõe cadência de telemetria, bloqueios, fila, aprovação e trilha auditável sem depender de promessa abstrata.',
        }
        : {
            title: 'Governança, observabilidade e handoff já entram no produto como comportamento nativo.',
            description: 'Em vez de depender de texto longo, a plataforma expõe thresholds reais, guardrails operacionais e pontos de supervisão humana.',
        };

    const visibleSignals = isCompact
        ? [telemetrySignals[0], telemetrySignals[2], telemetrySignals[4], telemetrySignals[5]]
        : telemetrySignals;
    const visibleGuardrails = isCompact ? guardrails.slice(0, 4) : guardrails;

    return (
        <section
            className={cn(
                'border-t border-[hsl(var(--ui-border)/0.4)] py-20 md:py-28',
                className
            )}
        >
            <PageContainer>
                <div className="max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-muted))]">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--ui-success))] opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--ui-success))]" />
                        </span>
                        Prova operacional
                    </span>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] md:text-4xl lg:text-5xl">
                        {intro.title}
                    </h2>
                    <p className="mt-5 text-lg leading-relaxed text-[hsl(var(--ui-text-muted))] md:text-xl">
                        {intro.description}
                    </p>
                </div>

                <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative overflow-hidden rounded-[28px] border border-[hsl(var(--ui-border)/0.45)] bg-[linear-gradient(180deg,hsl(var(--ui-surface)/0.72),hsl(var(--ui-surface)/0.22))] p-6 md:p-8">
                        <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-[hsl(var(--ui-accent-blue)/0.08)] blur-3xl" />
                        <div className="relative">
                            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div className="max-w-xl">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                                        Telemetria e thresholds reais
                                    </p>
                                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                                        O sistema já mede operação, segurança e saúde de fila.
                                    </h3>
                                </div>
                                <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.72)] px-4 py-3">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))]">
                                        Sinal público
                                    </span>
                                    <span className="mt-1 block text-sm font-semibold text-[hsl(var(--ui-text))]">
                                        Métricas expostas no produto
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {trackedKpis.map((kpi) => (
                                    <span
                                        key={kpi}
                                        className="inline-flex items-center rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.7)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]"
                                    >
                                        {kpi}
                                    </span>
                                ))}
                            </div>

                            <div className={cn('mt-6 grid gap-3', isCompact ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3')}>
                                {visibleSignals.map((signal) => (
                                    <article
                                        key={signal.label}
                                        className={cn(
                                            'rounded-2xl border p-4 transition-colors',
                                            signalToneClasses[signal.tone]
                                        )}
                                    >
                                        <span className="block text-2xl font-black tracking-tight md:text-[2rem]">
                                            {signal.value}
                                        </span>
                                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-current opacity-80">
                                            {signal.label}
                                        </span>
                                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                            {signal.detail}
                                        </p>
                                    </article>
                                ))}
                            </div>

                            <div className="mt-6 rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.66)] p-4">
                                <p className="text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    Esses sinais vêm da própria arquitetura operacional: cockpit com polling curto, status com leitura de fila, segurança com janelas de 24h e ações críticas sob governança.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                                    Guardrails nativos
                                </p>
                                <h3 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                                    Controle visível para escalar com segurança.
                                </h3>
                            </div>
                            <span className="inline-flex rounded-full border border-[hsl(var(--ui-success)/0.35)] bg-[hsl(var(--ui-success)/0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--ui-success))]">
                                supervisionado
                            </span>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.72)]">
                            {visibleGuardrails.map((item, index) => {
                                const Icon = item.icon;

                                return (
                                    <article
                                        key={item.title}
                                        className={cn(
                                            'grid gap-3 p-4 md:grid-cols-[auto_1fr_auto]',
                                            index > 0 && 'border-t border-[hsl(var(--ui-border)/0.45)]'
                                        )}
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                                {item.title}
                                            </h4>
                                            <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                                {item.detail}
                                            </p>
                                        </div>
                                        <div className="md:text-right">
                                            <span className="inline-flex rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface-elevated)/0.45)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                                                {item.status}
                                            </span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {isCompact ? (
                    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
                        <CompactPerspectiveLane
                            eyebrow="Operador"
                            items={operatorView.slice(0, 3)}
                        />
                        <CompactPerspectiveLane
                            eyebrow="Gestor"
                            items={managerControls.slice(0, 3)}
                        />
                        <CompactHandoffRail />
                    </div>
                ) : (
                    <>
                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            <PerspectiveCard
                                eyebrow="O operador vê"
                                title="Contexto pronto para agir."
                                items={operatorView}
                            />
                            <PerspectiveCard
                                eyebrow="O gestor controla"
                                title="Governança pronta para responder."
                                items={managerControls}
                            />
                        </div>

                        <div className="mt-6 rounded-[28px] border border-[hsl(var(--ui-border)/0.45)] bg-[linear-gradient(180deg,hsl(var(--ui-page)/0.8),hsl(var(--ui-surface)/0.28))] p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                                    Humano supervisiona, sistema acelera
                                </p>
                                <h3 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                                    Handoff não é fallback improvisado. Ele já faz parte do desenho operacional.
                                </h3>
                            </div>

                            <ol className="mt-6 grid gap-4 md:grid-cols-3">
                                {handoffRail.map((step, index) => {
                                    const Icon = step.icon;

                                    return (
                                        <li
                                            key={step.title}
                                            className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.52)] p-5"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--ui-text-subtle))]">
                                                    0{index + 1}
                                                </span>
                                            </div>
                                            <h4 className="mt-4 text-base font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                                {step.title}
                                            </h4>
                                            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                                {step.detail}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </>
                )}
            </PageContainer>
        </section>
    );
}

function PerspectiveCard({ eyebrow, title, items }: {
    eyebrow: string;
    title: string;
    items: PerspectiveItem[];
}) {
    return (
        <article className="rounded-[28px] border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                {eyebrow}
            </p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                {title}
            </h3>
            <ul className="mt-6 space-y-3">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <li
                            key={item.label}
                            className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.7)] p-4"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                                <Icon className="h-4 w-4" />
                            </div>
                            <p className="text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                {item.label}
                            </p>
                        </li>
                    );
                })}
            </ul>
        </article>
    );
}

function CompactPerspectiveLane({ eyebrow, items }: {
    eyebrow: string;
    items: PerspectiveItem[];
}) {
    return (
        <article className="rounded-[24px] border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.5)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                {eyebrow}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
                {items.map((item) => (
                    <span
                        key={item.label}
                        className="inline-flex items-center rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.72)] px-3 py-1.5 text-xs font-medium leading-relaxed text-[hsl(var(--ui-text-muted))]"
                    >
                        {item.label}
                    </span>
                ))}
            </div>
        </article>
    );
}

function CompactHandoffRail() {
    return (
        <article className="rounded-[24px] border border-[hsl(var(--ui-border)/0.45)] bg-[linear-gradient(180deg,hsl(var(--ui-page)/0.8),hsl(var(--ui-surface)/0.28))] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--ui-text-subtle))]">
                Handoff humano
            </p>
            <ol className="mt-4 space-y-3">
                {handoffRail.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.56)] px-3 py-3"
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] text-[11px] font-semibold text-[hsl(var(--ui-accent-blue))]">
                            0{index + 1}
                        </span>
                        <div>
                            <p className="text-sm font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                {step.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                {step.detail}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </article>
    );
}
