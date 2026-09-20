import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    Bot,
    FileCheck,
    Gauge,
    MessageCircle,
    Route,
    ScanSearch,
    Shield,
    Truck,
    UserCheck,
    Workflow,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    OperationFlow,
    PageContainer,
    PageSection,
    ScrollReveal,
    SectionIntro,
} from '@/ui/site';

export const metadata: Metadata = {
    title: 'Como funciona — CONDSTORE OS',
    description: 'Entenda o fluxo operacional: do WhatsApp ao cockpit, com cotação de frete, pedidos e logística em um sistema único supervisionado.',
};

interface StageCard {
    title: string;
    summary: string;
    detail: string;
    icon: LucideIcon;
    href: string;
}

interface CapabilityCard {
    title: string;
    points: string[];
    icon: LucideIcon;
    accentClass: string;
}

const overviewStages: StageCard[] = [
    {
        title: 'Atendimento',
        summary: 'WhatsApp centralizado com contexto',
        detail: 'Conversas são organizadas em uma fila única, preservando o histórico e a intenção do cliente.',
        icon: MessageCircle,
        href: '/crm-whatsapp',
    },
    {
        title: 'Cotação de Frete',
        summary: 'Cálculo multicarrier ágil',
        detail: 'A equipe compara opções de frete com critérios operacionais e comerciais sem sair do fluxo.',
        icon: Route,
        href: '/logistica-pedidos',
    },
    {
        title: 'Pedido e Logística',
        summary: 'Transição fluida para execução',
        detail: 'Aprovação vira pedido com responsável definido, rastro de decisão e acompanhamento de entrega.',
        icon: Truck,
        href: '/logistica-pedidos',
    },
    {
        title: 'Cockpit',
        summary: 'Visibilidade real da operação',
        detail: 'Gestores e operadores acompanham SLAs, exceções e prioridades em um painel vivo.',
        icon: Gauge,
        href: '/cockpit-gerencial',
    },
];

const frankCapabilities: CapabilityCard[] = [
    {
        title: 'Onde o Frank atua',
        points: [
            'Atua como copiloto supervisionado do operador.',
            'Classifica intenções e organiza o contexto inicial.',
            'Sinaliza riscos, atrasos e inconsistências para priorização.',
        ],
        icon: Bot,
        accentClass: 'text-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue)/0.1)]',
    },
    {
        title: 'Onde o Frank não atua',
        points: [
            'Nunca toma decisões autônomas ou fala sozinho com o cliente.',
            'Não aprova cotações ou pedidos sem validação humana.',
            'Não substitui a responsabilidade final da equipe de operação.',
        ],
        icon: Shield,
        accentClass: 'text-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger)/0.08)]',
    },
];

const operatorCards: StageCard[] = [
    {
        title: 'Controle de prioridade',
        summary: 'Decisão humana com dados prontos',
        detail: 'O operador atua por exceção com visibilidade de histórico, risco e impacto comercial.',
        icon: UserCheck,
        href: '/cockpit-gerencial',
    },
    {
        title: 'Velocidade com critério',
        summary: 'Menos troca de tela e mais execução',
        detail: 'O sistema encurta o ciclo de resposta, mas a aprovação crítica permanece na operação.',
        icon: Zap,
        href: '/crm-whatsapp',
    },
    {
        title: 'Governança real',
        summary: 'Histórico rastreável por tenant',
        detail: 'Cada ação é vinculada a um responsável, garantindo auditoria e continuidade operacional.',
        icon: Workflow,
        href: '/cockpit-gerencial',
    },
];

const productConnections = [
    {
        href: '/proof',
        title: 'Prova operacional',
        description: 'Veja evidências de operação real e maturidade de execução.',
    },
    {
        href: '/produto',
        title: 'Produto',
        description: 'Entenda os módulos que sustentam o fluxo operacional.',
    },
    {
        href: '/crm-whatsapp',
        title: 'CRM WhatsApp',
        description: 'Detalhamento do atendimento centralizado.',
    },
    {
        href: '/logistica-pedidos',
        title: 'Logística',
        description: 'Foco em frete, pedidos e shipments.',
    },
] as const;

export default function ComoFuncionaPage() {
    return (
        <>
            <PageSection spacing="xl">
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-14 items-start">
                        <div className="max-w-3xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-muted))]">
                                Fluxo operacional CONDSTORE OS
                            </span>
                            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.08]">
                                Do WhatsApp ao Cockpit: como conectamos sua operação de ponta a ponta.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl">
                                O CONDSTORE OS conecta atendimento, cotação, pedidos e logística em um fluxo único. IA supervisionada auxilia o operador, garantindo controle real e decisão humana.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href="/proof"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Ver prova operacional
                                </Link>
                                <Link
                                    href="/produto"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-text-muted))] transition-colors hover:text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))] rounded-full px-3 py-2"
                                >
                                    Explorar produto
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] p-6 md:p-7">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                Fases da operação
                            </h2>
                            <ol className="mt-4 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                {['Atendimento (WhatsApp)', 'Cotação de Frete', 'Pedido', 'Logística', 'Cockpit'].map((item, index) => (
                                    <li key={item} className="flex items-center gap-3">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-page))] text-xs font-bold text-[hsl(var(--ui-text))]">
                                            {index + 1}
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                Cada etapa alimenta a próxima. O gestor tem visão clara do estado de cada negociação e entrega em fluxo contínuo.
                            </p>
                        </aside>
                    </div>
                </PageContainer>
            </PageSection>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Visão geral"
                            title="O sistema operacional da sua logística comercial"
                            description="Entenda os pilares que garantem visibilidade e controle sem inflar a operação."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
                            {overviewStages.map((stage) => {
                                const Icon = stage.icon;
                                return (
                                    <Link
                                        key={stage.title}
                                        href={stage.href}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.28)] p-5 md:p-6 transition-colors hover:border-[hsl(var(--ui-border))] group"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.55)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold tracking-tight text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">
                                            {stage.title}
                                        </h3>
                                        <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                                            {stage.summary}
                                        </p>
                                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-subtle))]">
                                            {stage.detail}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14">
                            <div className="lg:sticky lg:top-28 h-fit">
                                <SectionIntro
                                    eyebrow="Fluxo operacional"
                                    title="A jornada do pedido sem quebra de contexto"
                                    description="Da primeira mensagem ao acompanhamento no cockpit, a informação flui de forma estruturada."
                                    align="left"
                                    className="mb-8"
                                />
                                <p className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-5 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    O fluxo supervisionado garante que a IA sugira e organize, enquanto o operador valida e executa a decisão final em pontos críticos.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-surface)/0.2)] p-4 md:p-6">
                                <OperationFlow
                                    steps={[
                                        {
                                            icon: MessageCircle,
                                            label: 'Atendimento e Contexto',
                                            detail: 'Conversas via WhatsApp entram no sistema com histórico e intenção classificados.',
                                        },
                                        {
                                            icon: Route,
                                            label: 'Cotação de Frete Supervisionada',
                                            detail: 'O operador compara opções multicarrier no mesmo contexto da conversa.',
                                            accent: 'var(--ui-success)',
                                        },
                                        {
                                            icon: FileCheck,
                                            label: 'Aprovação e Pedido',
                                            detail: 'A cotação aprovada vira pedido com estado visível e responsável definido.',
                                            accent: 'var(--ui-success)',
                                        },
                                        {
                                            icon: Truck,
                                            label: 'Logística e Execução',
                                            detail: 'Shipments são gerados e acompanhados, com tratamento de exceções centralizado.',
                                        },
                                        {
                                            icon: Gauge,
                                            label: 'Cockpit e Governança',
                                            detail: 'SLA, prazos e métricas operacionais alimentam a decisão diária da gestão.',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Copiloto Supervisionado"
                            title="IA Frank: Assistência sem perda de controle"
                            description="O Frank acelera a leitura e sugere próximos passos, mas a execução crítica é sempre humana."
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {frankCapabilities.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article
                                        key={card.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.accentClass}`}>
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <h3 className="text-lg font-bold tracking-tight text-[hsl(var(--ui-text))]">{card.title}</h3>
                                        </div>
                                        <ul className="mt-5 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                            {card.points.map((point) => (
                                                <li key={point} className="flex items-start gap-2.5 leading-relaxed">
                                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ui-text-subtle))]" />
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="mt-6 rounded-2xl border border-[hsl(var(--ui-warning)/0.45)] bg-[hsl(var(--ui-warning)/0.08)] p-5 md:p-6">
                            <p className="text-sm md:text-base font-semibold text-[hsl(var(--ui-text))]">
                                A CONDSTORE OS prioriza a segurança: o Frank não executa ações críticas ou financeiras sem aprovação explícita.
                                <Link href="/ia-frank" className="ml-2 underline hover:text-[hsl(var(--ui-accent-blue))]">Conheça o Frank</Link>
                            </p>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Operação e Decisão"
                            title="Capacidade ampliada com governança"
                            description="Reduza o retrabalho e dê visibilidade ao que realmente importa no dia a dia da operação."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {operatorCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <Link
                                        key={card.title}
                                        href={card.href}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.28)] p-6 transition-colors hover:border-[hsl(var(--ui-border))] group"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.6)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-base font-bold tracking-tight text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">{card.title}</h3>
                                        <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">{card.summary}</p>
                                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-subtle))]">{card.detail}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Próximos passos"
                            title="Aprofunde seu conhecimento"
                            description="Escolha por onde quer continuar explorando o ecossistema do CONDSTORE OS."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                            {productConnections.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.28)] p-5 transition-colors hover:border-[hsl(var(--ui-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{item.description}</p>
                                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-text-subtle))] transition-colors group-hover:text-[hsl(var(--ui-text))]">
                                        Acessar
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer narrow>
                        <div className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] px-6 py-8 md:px-10 md:py-10 text-center">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--ui-text))]">
                                Pronto para profissionalizar sua operação?
                            </h2>
                            <p className="mt-4 text-sm md:text-base leading-relaxed text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                                Agende uma conversa para entender como o fluxo supervisionado se aplica ao seu cenário logístico.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    href="/piloto"
                                    className="inline-flex h-11 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-6 text-sm font-bold text-white transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))]"
                                >
                                    Solicitar avaliação operacional
                                </Link>
                                <Link
                                    href="/proof"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))]"
                                >
                                    Ver prova operacional
                                </Link>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>
        </>
    );
}
