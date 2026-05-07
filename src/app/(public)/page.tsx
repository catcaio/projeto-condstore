import Link from 'next/link';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileSearch,
    Gauge,
    KanbanSquare,
    MessageCircle,
    PackageCheck,
    Route,
    UserCheck,
} from 'lucide-react';
import {
    FeatureGrid,
    OperationFlow,
    PageContainer,
    PageSection,
    ScrollReveal,
    SectionIntro,
} from '@/ui/site';

export const metadata = {
    title: 'CONDSTORE OS — Operação comercial e logística com controle real',
    description: 'Landing institucional oficial do CONDSTORE OS: operação supervisionada via WhatsApp, CRM operacional, frete e pedidos em um fluxo único com governança.',
};

export const revalidate = 86400;

const primaryCtaClass = 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--ui-text))] px-6 text-sm font-semibold text-[hsl(var(--ui-page))] transition-colors hover:bg-[hsl(var(--ui-text-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]';
const secondaryCtaClass = 'inline-flex h-12 items-center justify-center rounded-full border border-[hsl(var(--ui-border-strong))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]';
const inlineLinkClass = 'inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--ui-text))] underline-offset-4 transition-colors hover:text-[hsl(var(--ui-text-muted))] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]';

const painItems = [
    {
        icon: MessageCircle,
        title: 'Contexto quebrado no atendimento',
        description: 'A conversa acontece em uma tela e o status operacional está em outra. O time responde sem visão completa.',
    },
    {
        icon: Clock3,
        title: 'Cotação vira gargalo diário',
        description: 'Sem trilha única de decisão, a resposta ao cliente atrasa e a janela comercial se fecha.',
    },
    {
        icon: AlertTriangle,
        title: 'Exceções aparecem tarde',
        description: 'Pedido e shipment sem leitura contínua de estado geram retrabalho, urgência e ruído com o cliente.',
    },
    {
        icon: FileSearch,
        title: 'Governança fica reativa',
        description: 'Sem rastro operacional consolidado, fica difícil auditar decisões e priorizar ação de forma confiável.',
    },
];

const operationalSteps = [
    {
        icon: MessageCircle,
        label: 'WhatsApp supervisionado',
        detail: 'A conversa entra no fluxo com histórico de cliente e prioridade visível para o operador.',
    },
    {
        icon: Route,
        label: 'Cotação de frete no mesmo contexto',
        detail: 'A equipe compara opções com critério operacional e mantém a negociação na mesma linha de execução.',
        accent: 'var(--ui-success)',
    },
    {
        icon: PackageCheck,
        label: 'Pedido e shipment com dono',
        detail: 'A aprovação operacional vira pedido com responsável definido e trilha rastreável de ponta a ponta.',
    },
    {
        icon: Gauge,
        label: 'Cockpit diário de decisão',
        detail: 'SLA, exceções, fila e próximos passos ficam visiveis para execução e governança contínuas.',
        accent: 'var(--ui-success)',
    },
];

const cockpitCards = [
    {
        icon: KanbanSquare,
        title: 'Fila com prioridade explícita',
        description: 'O time sabe o que agir primeiro e por que, sem depender de memória ou planilha paralela.',
    },
    {
        icon: AlertTriangle,
        title: 'Exceção tratada com contexto',
        description: 'Atraso, risco e bloqueio aparecem no estado certo, com responsável e próximo passo definidos.',
    },
    {
        icon: Gauge,
        title: 'SLA visível por operação',
        description: 'Prazos e tempos de resposta ficam claros por fila, responsável e etapa do fluxo.',
    },
    {
        icon: UserCheck,
        title: 'Decisão com responsabilidade',
        description: 'Cada aprovação é vinculada a usuário, horário e contexto comercial para auditoria real.',
    },
];

const proofItems = [
    'A operação é supervisionada: o operador mantém a decisão em pontos críticos do fluxo.',
    'Atendimento, cotação, pedido e shipment compartilham a mesma trilha de execução.',
    'O cockpit diário prioriza ação rápida com estado visível e responsabilidade definida.',
    'Governança não é discurso: decisão, contexto e histórico ficam rastreaveis para o time.',
];

export default function HomePage() {
    return (
        <>
            <section className="border-b border-[hsl(var(--ui-border)/0.4)]">
                <PageContainer className="py-14 md:py-20">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--ui-text-subtle))]">
                                CONDSTORE OS • HOME CANÔNICA
                            </p>
                            <h1
                                data-testid="public-hero-title"
                                className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-[hsl(var(--ui-text))] md:text-5xl"
                            >
                                Do WhatsApp ao cockpit: atendimento, frete, pedido e logística no mesmo fluxo.
                            </h1>
                            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                O CONDSTORE OS conecta atendimento supervisionado pelo WhatsApp, cotação de frete, pedido e logística em um fluxo único.
                                {' '}
                                Frank atua como copiloto supervisionado enquanto o cockpit mantém estado, prioridade e decisão visíveis para o gestor.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link href="/piloto" className={primaryCtaClass} data-testid="public-primary-cta">
                                    Solicitar avaliação operacional
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link href="/login" className={secondaryCtaClass}>
                                    Entrar no sistema
                                </Link>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-5">
                                <Link href="/proof" className={inlineLinkClass}>
                                    Ver prova operacional
                                </Link>
                                <Link href="/solucoes" className={inlineLinkClass}>
                                    Entender o fluxo operacional
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                                Operação em fluxo integrado
                            </p>
                            <h2 className="mt-3 text-lg font-semibold text-[hsl(var(--ui-text))]">
                                Estado visível para decidir sem fricção.
                            </h2>
                            <ul className="mt-5 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--ui-success))]" />
                                    Conversas priorizadas com contexto comercial e operacional.
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--ui-success))]" />
                                    Aprovação antes de pedido e handoff claro para logística.
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--ui-success))]" />
                                    Timeline rastreável com dono, horário e próximo passo.
                                </li>
                            </ul>
                        </aside>
                    </div>

                    <nav aria-label="Próximos passos do MVP" className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-4">
                        {[
                            { href: '/crm-whatsapp', title: 'Atendimento CRM', description: 'Centralização de WhatsApp e contexto.' },
                            { href: '/logistica-pedidos', title: 'Logística e Pedidos', description: 'Cotação, pedidos e execução real.' },
                            { href: '/cockpit-gerencial', title: 'Cockpit Gerencial', description: 'Métricas, SLA e visibilidade operacional.' },
                            { href: '/ia-frank', title: 'IA Frank', description: 'Assistência supervisionada no fluxo.' },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] p-4 transition-colors hover:bg-[hsl(var(--ui-surface-elevated)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                            >
                                <span className="flex items-center justify-between text-sm font-semibold text-[hsl(var(--ui-text))]">
                                    {item.title}
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                                <span className="mt-2 block text-xs leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    {item.description}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </PageContainer>
            </section>

            <ScrollReveal>
                <PageSection spacing="md">
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Proposta de valor"
                            title="Clareza de operação para reduzir atrito e proteger margem."
                            description="O CONDSTORE OS resolve o caos entre o atendimento e a logística sem promessas vagas de autonomia total."
                        />
                        <FeatureGrid columns={4} items={painItems} />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop id="fluxo-operacional">
                    <PageContainer>
                        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
                            <div>
                                <SectionIntro
                                    eyebrow="Fluxo operacional resumido"
                                    title="Uma única jornada: atendimento, frete, pedido e cockpit."
                                    description="Sem troca de contexto entre áreas. O status de cada etapa alimenta a próxima decisão da equipe."
                                    align="left"
                                />
                                <Link href="/como-funciona" className={inlineLinkClass}>
                                    Ver como funciona detalhado
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] p-4 md:p-6">
                                <OperationFlow steps={operationalSteps} />
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Visão do cockpit"
                            title="Estado operacional visível para ação rápida."
                            description="Cada bloco do cockpit existe para orientar decisão imediata e reduzir retrabalho no dia a dia."
                        />
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {cockpitCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article
                                        key={item.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.35)] p-6"
                                    >
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-muted)/0.7)]">
                                            <Icon className="h-5 w-5 text-[hsl(var(--ui-text))]" />
                                        </div>
                                        <h3 className="text-base font-semibold text-[hsl(var(--ui-text))]">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{item.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="mt-8">
                            <Link href="/cockpit-gerencial" className={inlineLinkClass}>
                                Explorar cockpit e métricas
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Prova operacional"
                            title="Credibilidade baseada em execução, não em promessa."
                            description="A proposta institucional do CONDSTORE OS reforça operação supervisionada, governança e continuidade entre equipes."
                        />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <article className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.35)] p-6">
                                <h3 className="text-base font-semibold text-[hsl(var(--ui-text))]">Evidências de operação real</h3>
                                <ul className="mt-4 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                    {proofItems.map((item) => (
                                        <li key={item} className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--ui-success))]" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                            <article className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.35)] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                                    IA Frank Supervisionada
                                </p>
                                <h3 className="mt-2 text-base font-semibold text-[hsl(var(--ui-text))]">
                                    O copiloto que entende seu fluxo.
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    Frank organiza o contexto e sinaliza riscos para que o operador decida com velocidade. Sem automação cega, com assistência real.
                                </p>
                                <Link href="/ia-frank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-accent-blue))]">
                                    Conhecer o Frank
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </article>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <section className="border-y border-[hsl(var(--ui-border)/0.4)] py-14 md:py-20">
                <PageContainer narrow>
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--ui-text-subtle))]">
                            Próxima decisão
                        </p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--ui-text))] md:text-4xl">
                            Avalie seu cenário e avance para o próximo passo certo.
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--ui-text-muted))]">
                            Do atendimento ao cockpit, o CONDSTORE OS profissionaliza sua operação logística comercial com controle e governança.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link href="/piloto" className={primaryCtaClass}>
                                Solicitar avaliação operacional
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link href="/login" className={secondaryCtaClass}>
                                Entrar no sistema
                            </Link>
                        </div>
                    </div>
                </PageContainer>
            </section>
        </>
    );
}
