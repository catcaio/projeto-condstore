import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    Bot,
    Calculator,
    Gauge,
    Inbox,
    Link2,
    MessageCircle,
    Package,
    Shield,
    Truck,
    UserCheck,
    Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    PageContainer,
    PageSection,
    ScrollReveal,
    SectionIntro,
    SiteBadge,
    SiteButton,
    SiteCard,
} from '@/ui/site';

export const metadata: Metadata = {
    title: 'Produto — CONDSTORE OS',
    description: 'Conheça o CONDSTORE OS: o sistema operacional que centraliza atendimento via WhatsApp, cotação de frete, pedidos e logística em um cockpit unificado.',
    robots: { index: true, follow: true },
};

interface ConsolidatedBlock {
    title: string;
    summary: string;
    handoff: string;
    connectsTo: string;
    icon: LucideIcon;
    href: string;
}

interface ArchitectureStage {
    stage: string;
    summary: string;
    items: string[];
    icon: LucideIcon;
}

interface ModuleCard {
    name: string;
    role: string;
    description: string;
    connections: string[];
    icon: LucideIcon;
    href: string;
}

interface StructuralPoint {
    title: string;
    description: string;
    icon: LucideIcon;
}

const heroChecklist = [
    'Módulos conectados no mesmo ciclo operacional.',
    'IA Frank como copiloto supervisionado.',
    'Governança, visibilidade e rastro de decisão.',
] as const;

const consolidatedBlocks: ConsolidatedBlock[] = [
    {
        title: 'Atendimento',
        summary: 'Inbox centralizado para WhatsApp, organizando a fila por prioridade.',
        handoff: 'Contexto preservado para a fase de cotação.',
        connectsTo: 'Cotações',
        icon: MessageCircle,
        href: '/crm-whatsapp',
    },
    {
        title: 'Cotações',
        summary: 'Cálculo de frete multicarrier com margem e critérios operacionais.',
        handoff: 'Cotação aprovada vira pedido automaticamente.',
        connectsTo: 'Pedidos',
        icon: Calculator,
        href: '/logistica-pedidos',
    },
    {
        title: 'Pedidos',
        summary: 'Gestão de pedidos com estado, responsável e histórico auditável.',
        handoff: 'Dispara a execução logística e shipments.',
        connectsTo: 'Logística',
        icon: Package,
        href: '/logistica-pedidos',
    },
    {
        title: 'Logística',
        summary: 'Execução, despacho e acompanhamento de entregas.',
        handoff: 'Alimenta o cockpit com dados de execução.',
        connectsTo: 'Cockpit',
        icon: Truck,
        href: '/logistica-pedidos',
    },
    {
        title: 'Cockpit',
        summary: 'Centro de controle com SLA, exceções e alertas operacionais.',
        handoff: 'Gera visibilidade para novas decisões.',
        connectsTo: 'Gestão',
        icon: Gauge,
        href: '/cockpit-gerencial',
    },
];

const architectureStages: ArchitectureStage[] = [
    {
        stage: 'Entrada',
        summary: 'Centralização de canais em uma fila única supervisionada.',
        items: ['WhatsApp', 'Portal', 'API'],
        icon: Inbox,
    },
    {
        stage: 'Operação',
        summary: 'Cotação e pedido com rastro de decisão e dono definido.',
        items: ['Cotação ágil', 'Aprovação humana', 'Pedido rastreável'],
        icon: UserCheck,
    },
    {
        stage: 'Execução',
        summary: 'Logística e shipment integrados ao fluxo comercial.',
        items: ['Multicarrier', 'Shipments', 'Exceções'],
        icon: Workflow,
    },
    {
        stage: 'Controle',
        summary: 'Cockpit diário para ação rápida e governança real.',
        items: ['Visibilidade SLA', 'Fila de ação', 'Estado vivo'],
        icon: Gauge,
    },
];

const moduleCards: ModuleCard[] = [
    {
        name: 'CRM Operacional',
        role: 'Centralizar conversas e contexto do cliente.',
        description: 'Evita a perda de informação entre o atendimento e a execução logística.',
        connections: ['WhatsApp', 'Cotações', 'Frank'],
        icon: MessageCircle,
        href: '/crm-whatsapp',
    },
    {
        name: 'Logística e Cotação',
        role: 'Comparar fretes com regras de margem e operação.',
        description: 'Transforma a demanda em opção viável sem depender de planilhas paralelas.',
        connections: ['Inbox', 'Pedidos', 'Transportadoras'],
        icon: Calculator,
        href: '/logistica-pedidos',
    },
    {
        name: 'Gestão de Pedidos',
        role: 'Formalizar e rastrear o compromisso operacional.',
        description: 'Cada pedido nasce com rastro total desde a primeira mensagem do cliente.',
        connections: ['Cotações', 'Logística', 'Cockpit'],
        icon: Package,
        href: '/logistica-pedidos',
    },
    {
        name: 'Cockpit Diário',
        role: 'Visibilidade e priorização para o gestor.',
        description: 'Painel que destaca o que precisa de ação imediata para proteger o SLA.',
        connections: ['Atendimento', 'Pedidos', 'Métricas'],
        icon: Gauge,
        href: '/cockpit-gerencial',
    },
    {
        name: 'IA Frank Supervisionada',
        role: 'Copiloto supervisionado para acelerar o time.',
        description: 'O Frank sugere respostas e organiza dados, mas não decide sozinho.',
        connections: ['Sugestões', 'Alertas', 'Priorização'],
        icon: Bot,
        href: '/ia-frank',
    },
];

const structuralPoints: StructuralPoint[] = [
    {
        title: 'Sem silos operacionais',
        description: 'Atendimento, frete e logística compartilham o mesmo estado e histórico.',
        icon: Link2,
    },
    {
        title: 'Decisão assistida',
        description: 'A IA organiza o contexto para que o humano decida com mais velocidade e precisão.',
        icon: Workflow,
    },
    {
        title: 'Segurança e Isolamento',
        description: 'Isolamento rigoroso por tenant e conformidade com LGPD como base.',
        icon: Shield,
    },
];

export default function ProdutoPage() {
    return (
        <>
            <PageSection spacing="lg">
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-start">
                        <div className="max-w-3xl">
                            <SiteBadge variant="accent" className="uppercase tracking-[0.15em] text-[11px]">
                                Produto CONDSTORE OS
                            </SiteBadge>
                            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.08]">
                                O sistema operacional que conecta sua logística comercial.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl">
                                Centralize conversas de WhatsApp, cotações de frete, pedidos e logística em um cockpit operacional único. Dê visibilidade ao gestor e reduza o retrabalho do time.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <SiteButton href="/como-funciona" variant="accent">
                                    Ver como funciona
                                </SiteButton>
                                <SiteButton href="/contato" variant="secondary">
                                    Falar com o time
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </SiteButton>
                            </div>
                        </div>

                        <SiteCard variant="default" className="p-6 md:p-7">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                Destaques do MVP
                            </h2>
                            <ul className="mt-4 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                {heroChecklist.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </SiteCard>
                    </div>
                </PageContainer>
            </PageSection>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Fluxo Unificado"
                            title="Um ciclo operacional sem interrupções"
                            description="Atendimento, cotação, pedidos e logística funcionam conectados. O handoff entre etapas é automático e rastreável."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
                            {consolidatedBlocks.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <Link
                                        key={block.title}
                                        href={block.href}
                                        className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))]"
                                    >
                                        <SiteCard variant="interactive" className="h-full p-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.65)] text-[hsl(var(--ui-accent-blue))]">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <h3 className="mt-4 text-base font-bold tracking-tight text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">{block.title}</h3>
                                                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{block.summary}</p>
                                                <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--ui-text-subtle))]">{block.handoff}</p>
                                            </div>
                                            <div className="mt-4">
                                                <SiteBadge variant="accent" className="text-[11px] font-semibold">
                                                    Alimenta {block.connectsTo}
                                                </SiteBadge>
                                            </div>
                                        </SiteCard>
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
                            eyebrow="Arquitetura do Produto"
                            title="Visibilidade e controle operacional"
                            description="O CONDSTORE OS opera como um fluxo contínuo, onde cada decisão gera dados para o cockpit."
                        />
                        <SiteCard variant="default" className="rounded-3xl p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {architectureStages.map((stage) => {
                                    const Icon = stage.icon;
                                    return (
                                        <SiteCard
                                            key={stage.stage}
                                            variant="default"
                                            className="p-4 bg-[hsl(var(--ui-page)/0.65)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.75)] text-[hsl(var(--ui-accent-blue))]">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{stage.stage}</h3>
                                            </div>
                                            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{stage.summary}</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {stage.items.map((item) => (
                                                    <SiteBadge
                                                        key={`${stage.stage}-${item}`}
                                                        variant="accent"
                                                        className="text-[11px] font-semibold"
                                                    >
                                                        {item}
                                                    </SiteBadge>
                                                ))}
                                            </div>
                                        </SiteCard>
                                    );
                                })}
                            </div>
                        </SiteCard>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Módulos"
                            title="Capacidade operacional simplificada"
                            description="Cada componente do sistema tem um papel claro na redução do atrito operacional."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {moduleCards.map((module) => {
                                const Icon = module.icon;
                                return (
                                    <Link
                                        key={module.name}
                                        href={module.href}
                                        className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))]"
                                    >
                                        <SiteCard variant="interactive" className="h-full p-5 md:p-6 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.75)] text-[hsl(var(--ui-accent-blue))]">
                                                        <Icon className="h-5 w-5" />
                                                    </span>
                                                    <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">{module.name}</h3>
                                                </div>
                                                <p className="mt-4 text-sm font-medium text-[hsl(var(--ui-text))]">{module.role}</p>
                                                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{module.description}</p>
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {module.connections.map((connection) => (
                                                    <SiteBadge key={`${module.name}-${connection}`} variant="accent" className="text-[11px] font-semibold">
                                                        {connection}
                                                    </SiteBadge>
                                                ))}
                                            </div>
                                        </SiteCard>
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
                        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10 items-start">
                            <SectionIntro
                                eyebrow="Diferenciais"
                                title="Foco no que importa: a operação diária"
                                description="Não prometemos autonomia total. Entregamos assistência real para quem executa a logística."
                                align="left"
                                className="mb-0"
                            />
                            <div className="space-y-4">
                                {structuralPoints.map((point) => {
                                    const Icon = point.icon;
                                    return (
                                        <SiteCard key={point.title} variant="default" className="p-5">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.75)] text-[hsl(var(--ui-accent-blue))]">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{point.title}</h3>
                                            </div>
                                            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{point.description}</p>
                                        </SiteCard>
                                    );
                                })}
                            </div>
                        </div>
                        <SiteCard variant="default" className="mt-8 p-5 md:p-6">
                            <div className="flex items-start gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-success)/0.14)] text-[hsl(var(--ui-success))]">
                                    <Shield className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                        FILOSOFIA SUPERVISIONADA
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                        Frank (nossa IA) atua como copiloto supervisionado. Ele sugere e organiza, mas nunca aprova ou executa ações críticas sem a validação de um operador humano.
                                    </p>
                                    <Link href="/ia-frank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline">
                                        Saiba mais sobre o Frank
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </SiteCard>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer narrow>
                        <SiteCard variant="elevated" className="rounded-3xl px-6 py-8 md:px-10 md:py-10 text-center">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--ui-text))]">
                                Próxima etapa: validar sua operação.
                            </h2>
                            <p className="mt-4 text-sm md:text-base leading-relaxed text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                                Agende uma demonstração ou solicite uma avaliação operacional para ver como o CONDSTORE OS pode organizar sua rotina.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                                <SiteButton href="/piloto" variant="accent">
                                    Solicitar avaliação
                                </SiteButton>
                                <SiteButton href="/proof" variant="secondary">
                                    Ver prova operacional
                                </SiteButton>
                            </div>
                        </SiteCard>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>
        </>
    );
}
