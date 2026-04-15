import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    Bot,
    FileCheck,
    Gauge,
    Inbox,
    ScanSearch,
    Shield,
    Truck,
    UserCheck,
    Users,
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
    title: 'Como funciona — Condstore OS',
    description: 'Fluxo operacional completo do CONDSTORE OS: entrada, contexto, cotacao, pedido, execucao e cockpit com operacao supervisionada.',
};

interface StageCard {
    title: string;
    summary: string;
    detail: string;
    icon: LucideIcon;
}

interface CapabilityCard {
    title: string;
    points: string[];
    icon: LucideIcon;
    accentClass: string;
}

const overviewStages: StageCard[] = [
    {
        title: 'Entrada',
        summary: 'Lead recebido em canal operacional',
        detail: 'WhatsApp, portal ou API iniciam o fluxo com rastreabilidade desde o primeiro contato.',
        icon: Inbox,
    },
    {
        title: 'Processamento',
        summary: 'Contexto e intencao organizados',
        detail: 'Cliente, historico e classificacao da demanda sao preparados para reduzir retrabalho.',
        icon: ScanSearch,
    },
    {
        title: 'Operacao',
        summary: 'Cotacao, pedido e execucao conectados',
        detail: 'A operacao segue com estados claros, responsavel definido e transicao entre etapas sem perda de dados.',
        icon: Workflow,
    },
    {
        title: 'Saida',
        summary: 'Cockpit atualizado em tempo real',
        detail: 'Fila, SLA, margem e excecoes refletem o andamento real para decisao imediata.',
        icon: Gauge,
    },
];

const frankCapabilities: CapabilityCard[] = [
    {
        title: 'Onde a IA atua',
        points: [
            'Classifica intencao e organiza contexto de conversa.',
            'Sugere resposta, cotacao e proximo passo operacional.',
            'Sinaliza risco, atraso e inconsistencias para priorizacao.',
        ],
        icon: Bot,
        accentClass: 'text-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue)/0.1)]',
    },
    {
        title: 'Onde a IA nao atua',
        points: [
            'Nao aprova pedido sozinha.',
            'Nao executa acao critica sem validacao humana.',
            'Nao substitui governanca, SLA e responsabilidade do operador.',
        ],
        icon: Shield,
        accentClass: 'text-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger)/0.08)]',
    },
];

const operatorCards: StageCard[] = [
    {
        title: 'Controle de prioridade',
        summary: 'Fila com contexto pronto para decisao',
        detail: 'O operador atua por excecao com visibilidade de historico, risco e impacto comercial.',
        icon: UserCheck,
    },
    {
        title: 'Velocidade com criterio',
        summary: 'Menos troca de tela e menos retrabalho',
        detail: 'As sugestoes encurtam o ciclo, mas a aprovacao final continua na operacao.',
        icon: Zap,
    },
    {
        title: 'Escala com confiabilidade',
        summary: 'Mais volume sem perder governanca',
        detail: 'Padroes e guardrails permitem crescimento com qualidade operacional previsivel.',
        icon: Workflow,
    },
];

const productConnections = [
    {
        href: '/proof',
        title: 'Prova operacional',
        description: 'Veja evidencia de operacao real e maturidade de execucao.',
    },
    {
        href: '/plataforma',
        title: 'Plataforma',
        description: 'Entenda os modulos que sustentam o fluxo operacional.',
    },
    {
        href: '/solucoes',
        title: 'Solucoes',
        description: 'Escolha o recorte ideal para sua operacao atual.',
    },
    {
        href: '/about',
        title: 'Contato',
        description: 'Converse com o time sobre escopo e implantacao supervisionada.',
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
                                Fluxo operacional completo
                            </span>
                            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.08]">
                                Como o CONDSTORE OS conecta entrada, execucao e cockpit sem perder contexto.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl">
                                A operacao avanca em etapas claras, com IA supervisionada e decisao final no operador. O objetivo e reduzir friccao sem abrir mao de controle.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href="/proof"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Ver prova operacional
                                </Link>
                                <Link
                                    href="/plataforma"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-text-muted))] transition-colors hover:text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))] rounded-full px-3 py-2"
                                >
                                    Explorar arquitetura
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] p-6 md:p-7">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                Estrutura de leitura
                            </h2>
                            <ol className="mt-4 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                {['Entrada', 'Processamento', 'Operacao', 'Saida'].map((item, index) => (
                                    <li key={item} className="flex items-center gap-3">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-page))] text-xs font-bold text-[hsl(var(--ui-text))]">
                                            {index + 1}
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                Cada etapa alimenta a proxima. Nenhum time precisa recomecar do zero quando o fluxo muda de canal ou de modulo.
                            </p>
                        </aside>
                    </div>
                </PageContainer>
            </PageSection>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Visao geral do sistema"
                            title="Entrada -> processamento -> operacao -> saida"
                            description="Um resumo do caminho operacional para leitura rapida antes do fluxo detalhado."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
                            {overviewStages.map((stage) => {
                                const Icon = stage.icon;
                                return (
                                    <article
                                        key={stage.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.28)] p-5 md:p-6 transition-colors hover:border-[hsl(var(--ui-border))]"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.55)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold tracking-tight text-[hsl(var(--ui-text))]">
                                            {stage.title}
                                        </h3>
                                        <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                                            {stage.summary}
                                        </p>
                                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-subtle))]">
                                            {stage.detail}
                                        </p>
                                    </article>
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
                                    eyebrow="Fluxo detalhado"
                                    title="Seis etapas para fechar o ciclo operacional"
                                    description="Do lead ao cockpit, cada transicao preserva contexto e define o proximo passo com clareza."
                                    align="left"
                                    className="mb-8"
                                />
                                <p className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-5 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                    O fluxo abaixo representa o core do MVP supervisionado: a IA sugere e organiza; o operador valida e executa a decisao final.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-[hsl(var(--ui-border)/0.35)] bg-[hsl(var(--ui-surface)/0.2)] p-4 md:p-6">
                                <OperationFlow
                                    steps={[
                                        {
                                            icon: Inbox,
                                            label: 'Entrada de lead (WhatsApp, portal ou API)',
                                            detail: 'A demanda entra com identificacao de canal e segue para consolidacao de contexto.',
                                        },
                                        {
                                            icon: Users,
                                            label: 'Organizacao de contexto (cliente + historico)',
                                            detail: 'Perfil, conversas e pedidos anteriores sao conectados para preparar a decisao.',
                                            accent: 'var(--ui-success)',
                                        },
                                        {
                                            icon: Zap,
                                            label: 'Geracao de cotacao',
                                            detail: 'A simulacao e montada com regras operacionais e encaminhada para avaliacao humana.',
                                        },
                                        {
                                            icon: FileCheck,
                                            label: 'Criacao de pedido',
                                            detail: 'Com aprovacao do operador, o pedido nasce com estado inicial e responsavel definido.',
                                            accent: 'var(--ui-success)',
                                        },
                                        {
                                            icon: Truck,
                                            label: 'Execucao operacional',
                                            detail: 'Despacho, acompanhamento e excecoes acontecem no mesmo fluxo, sem quebra de contexto.',
                                        },
                                        {
                                            icon: Gauge,
                                            label: 'Atualizacao do cockpit',
                                            detail: 'SLA, margem, status e alertas retornam para visibilidade diaria de operacao.',
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
                            eyebrow="Papel da IA (Frank)"
                            title="Assistencia supervisionada com fronteira clara"
                            description="Frank acelera leitura e sugestao. A execucao critica permanece sob controle do operador."
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
                                Sugestao nao e execucao automatica. Aprovacao humana e parte obrigatoria do fluxo supervisionado.
                            </p>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Papel do operador"
                            title="Mais capacidade operacional sem perder decisao"
                            description="O sistema amplia velocidade e contexto da equipe, mantendo governanca nas escolhas criticas."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {operatorCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article
                                        key={card.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.28)] p-6"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.6)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{card.title}</h3>
                                        <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">{card.summary}</p>
                                        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-subtle))]">{card.detail}</p>
                                    </article>
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
                            eyebrow="Conexao com produto"
                            title="Aprofunde por modulo"
                            description="Use os atalhos abaixo para seguir no recorte que faz sentido para sua avaliacao."
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
                                Quer validar esse fluxo na sua operacao?
                            </h2>
                            <p className="mt-4 text-sm md:text-base leading-relaxed text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                                Podemos mostrar a prova operacional ou discutir seu cenario com escopo supervisionado.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    href="/proof"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Ver prova operacional
                                </Link>
                                <Link
                                    href="/about"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-transparent px-6 text-sm font-semibold text-[hsl(var(--ui-text-muted))] transition-colors hover:text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Falar com o time
                                </Link>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>
        </>
    );
}
