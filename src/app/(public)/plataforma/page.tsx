import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    Bot,
    Calculator,
    Gauge,
    Inbox,
    Link2,
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
} from '@/ui/site';

export const metadata: Metadata = {
    title: 'Plataforma - CONDSTORE OS',
    description: 'Visao consolidada do CONDSTORE OS: atendimento, cotacoes, pedidos, operacao e cockpit conectados em um fluxo supervisionado.',
    robots: { index: true, follow: true },
};

interface ConsolidatedBlock {
    title: string;
    summary: string;
    handoff: string;
    connectsTo: string;
    icon: LucideIcon;
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
}

interface StructuralPoint {
    title: string;
    description: string;
    icon: LucideIcon;
}

const heroChecklist = [
    'Como os modulos se conectam no mesmo ciclo operacional.',
    'Onde entra a IA e onde a decisao permanece humana.',
    'Quais paginas ajudam a validar o produto antes da decisao final.',
] as const;

const consolidatedBlocks: ConsolidatedBlock[] = [
    {
        title: 'Atendimento',
        summary: 'Inbox recebe a demanda por WhatsApp, API ou portal e organiza prioridade da fila.',
        handoff: 'Encaminha dados completos para cotacao sem recomecar do zero.',
        connectsTo: 'Cotacoes',
        icon: Inbox,
    },
    {
        title: 'Cotacoes',
        summary: 'Simulacao de frete com regra operacional e margem visivel para aprovacao.',
        handoff: 'Cotacao aprovada vira pedido com o mesmo contexto.',
        connectsTo: 'Pedidos',
        icon: Calculator,
    },
    {
        title: 'Pedidos',
        summary: 'Pedido nasce com estado, responsavel e historico auditavel desde o inicio.',
        handoff: 'Dispara execucao logistica sem troca de ferramenta.',
        connectsTo: 'Operacao',
        icon: Package,
    },
    {
        title: 'Operacao',
        summary: 'Despacho, acompanhamento e excecoes seguem no mesmo fluxo do pedido.',
        handoff: 'Atualiza fila e indicadores de execucao continuamente.',
        connectsTo: 'Cockpit',
        icon: Truck,
    },
    {
        title: 'Cockpit',
        summary: 'Centro de controle com SLA, margem, alertas e prioridades operacionais.',
        handoff: 'Realimenta atendimento e decisao com dados da operacao.',
        connectsTo: 'Atendimento',
        icon: Gauge,
    },
];

const architectureStages: ArchitectureStage[] = [
    {
        stage: 'Entrada',
        summary: 'O sistema recebe eventos de canais diferentes na mesma fila operacional.',
        items: ['WhatsApp', 'API', 'Portal'],
        icon: Inbox,
    },
    {
        stage: 'Processamento',
        summary: 'IA organiza contexto e sugere; operador valida antes de avancar.',
        items: ['Contexto unico', 'IA supervisionada', 'Aprovacao humana'],
        icon: UserCheck,
    },
    {
        stage: 'Execucao',
        summary: 'Cotacao, pedido e logistica rodam com estados claros e responsavel definido.',
        items: ['Cotacao', 'Pedido', 'Fluxo logistico'],
        icon: Workflow,
    },
    {
        stage: 'Controle',
        summary: 'Cockpit consolida fila, excecoes e desempenho para decisao imediata.',
        items: ['Cockpit vivo', 'SLA', 'Margem operacional'],
        icon: Gauge,
    },
];

const moduleCards: ModuleCard[] = [
    {
        name: 'Inbox / Atendimento',
        role: 'Receber, priorizar e responder com contexto operacional.',
        description: 'Consolida os canais de entrada e evita perda de informacao entre atendimento e execucao.',
        connections: ['Cotacoes', 'Pedidos', 'Frank'],
        icon: Inbox,
    },
    {
        name: 'Cotacoes',
        role: 'Gerar proposta de frete com regra de operacao e margem.',
        description: 'Transforma demanda em opcao viavel para aprovacao sem depender de planilha paralela.',
        connections: ['Inbox', 'Pedidos', 'Cockpit'],
        icon: Calculator,
    },
    {
        name: 'Pedidos',
        role: 'Formalizar o compromisso operacional e iniciar execucao.',
        description: 'Cada pedido nasce com responsavel, estado e historico para rastreabilidade total.',
        connections: ['Cotacoes', 'Operacao', 'Cockpit'],
        icon: Package,
    },
    {
        name: 'Cockpit',
        role: 'Central de controle diario da operacao.',
        description: 'Mostra prioridades, risco, SLA e indicadores que direcionam acao rapida da equipe.',
        connections: ['Atendimento', 'Pedidos', 'IA (Frank)'],
        icon: Gauge,
    },
    {
        name: 'IA Frank Supervisionada',
        role: 'Copiloto supervisionado para acelerar leitura e sugestao.',
        description: 'O Frank sugere resposta e proximo passo, mas nao aprova cotacao nem pedido sem operador.',
        connections: ['Inbox', 'Cotacoes', 'Cockpit'],
        icon: Bot,
    },
];

const structuralPoints: StructuralPoint[] = [
    {
        title: 'Nao e ferramenta isolada',
        description: 'Os modulos compartilham estado e historico. O time nao alterna entre sistemas desconectados.',
        icon: Link2,
    },
    {
        title: 'Infraestrutura operacional',
        description: 'O produto sustenta rotina diaria, excecao e auditoria no mesmo trilho operacional.',
        icon: Workflow,
    },
    {
        title: 'Governanca embutida',
        description: 'Permissao, aprovacao e rastreabilidade sao parte da arquitetura, nao um add-on.',
        icon: Shield,
    },
];

const connectionLinks = [
    {
        href: '/proof',
        title: 'Prova operacional',
        description: 'Evidencia de uso real do sistema na rotina de operacao.',
    },
    {
        href: '/como-funciona',
        title: 'Como funciona',
        description: 'Fluxo supervisionado completo da entrada ao cockpit.',
    },
    {
        href: '/solucoes',
        title: 'Solucoes',
        description: 'Recortes praticos para cada momento da sua operacao.',
    },
    {
        href: '/contato',
        title: 'Contato',
        description: 'Conversa direta com o time para validar escopo e implantacao.',
    },
] as const;

export default function PlataformaPage() {
    return (
        <>
            <PageSection spacing="lg">
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-start">
                        <div className="max-w-3xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.45)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-muted))]">
                                Plataforma CONDSTORE OS
                            </span>
                            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.08]">
                                Uma plataforma unica para conectar atendimento, cotacao, pedidos, operacao e cockpit.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl">
                                Aqui o produto aparece como um sistema continuo. Cada etapa entrega contexto para a seguinte e mantem controle operacional sem prometer autonomia total.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href="/como-funciona"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Ver fluxo supervisionado
                                </Link>
                                <Link
                                    href="/proof"
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[hsl(var(--ui-text-muted))] transition-colors hover:text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Ver prova operacional
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] p-6 md:p-7">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                Leitura rapida
                            </h2>
                            <ul className="mt-4 space-y-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                {heroChecklist.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                </PageContainer>
            </PageSection>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Visao consolidada"
                            title="Cinco modulos, um ciclo operacional"
                            description="Atendimento, cotacao, pedidos, operacao e cockpit funcionam conectados. O handoff entre etapas ja nasce no proprio sistema."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
                            {consolidatedBlocks.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <article
                                        key={block.title}
                                        className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-5 transition-colors hover:border-[hsl(var(--ui-border))]"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.65)] text-[hsl(var(--ui-accent-blue))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{block.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{block.summary}</p>
                                        <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--ui-text-subtle))]">{block.handoff}</p>
                                        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ui-muted)/0.6)] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--ui-text-subtle))]">
                                            Conecta com {block.connectsTo}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                        <p className="mt-6 text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            O ciclo fecha no cockpit e retorna para atendimento sem perda de contexto. A operacao ganha velocidade com governanca.
                        </p>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Arquitetura funcional"
                            title="Entrada, processamento, execucao e controle"
                            description="A plataforma opera como fluxo continuo, nao como modulos isolados."
                        />
                        <div className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {architectureStages.map((stage) => {
                                    const Icon = stage.icon;
                                    return (
                                        <article
                                            key={stage.stage}
                                            className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-page)/0.65)] p-4"
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
                                                    <span
                                                        key={`${stage.stage}-${item}`}
                                                        className="inline-flex items-center rounded-full border border-[hsl(var(--ui-border)/0.6)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--ui-text-subtle))]"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                Cada etapa publica estado para a etapa seguinte e para o cockpit. Esse fluxo evita retrabalho e melhora decisão operacional.
                            </p>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Modulos do sistema"
                            title="Responsabilidade clara em cada modulo"
                            description="Cada bloco tem papel definido e conexao explicita com os demais."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {moduleCards.map((module) => {
                                const Icon = module.icon;
                                return (
                                    <article
                                        key={module.name}
                                        className="flex flex-col rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-5 md:p-6 transition-colors hover:border-[hsl(var(--ui-border))]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.75)] text-[hsl(var(--ui-accent-blue))]">
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{module.name}</h3>
                                        </div>
                                        <p className="mt-4 text-sm font-medium text-[hsl(var(--ui-text))]">{module.role}</p>
                                        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{module.description}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {module.connections.map((connection) => (
                                                <ModulePill key={`${module.name}-${connection}`} label={connection} />
                                            ))}
                                        </div>
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
                        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10 items-start">
                            <SectionIntro
                                eyebrow="Diferencial estrutural"
                                title="Infraestrutura operacional, nao ferramenta avulsa"
                                description="O valor da plataforma esta na conexao entre modulos, no estado unico e na governanca que suporta escala."
                                align="left"
                                className="mb-0"
                            />
                            <div className="space-y-4">
                                {structuralPoints.map((point) => {
                                    const Icon = point.icon;
                                    return (
                                        <article
                                            key={point.title}
                                            className="rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.3)] p-5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface-elevated)/0.75)] text-[hsl(var(--ui-accent-blue))]">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <h3 className="text-base font-bold tracking-tight text-[hsl(var(--ui-text))]">{point.title}</h3>
                                            </div>
                                            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">{point.description}</p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-8 rounded-2xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.25)] p-5 md:p-6">
                            <div className="flex items-start gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--ui-success)/0.14)] text-[hsl(var(--ui-success))]">
                                    <Shield className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                        COPILOTO_SUPERVISIONADO
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ui-text-muted))]">
                                        O Frank opera como copiloto supervisionado. Ele pode sugerir resposta e proximo passo, mas nao executa aprovacao de cotacao ou pedido sem operador responsavel.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            <ScrollReveal>
                <PageSection spacing="md" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Conexao"
                            title="Continue a avaliacao da plataforma"
                            description="Acesse os recortes que aprofundam prova operacional, fluxo e posicionamento do produto."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                            {connectionLinks.map((item) => (
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
                        <div className="rounded-3xl border border-[hsl(var(--ui-border)/0.45)] bg-[hsl(var(--ui-surface)/0.35)] px-6 py-8 md:px-10 md:py-10 text-center">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--ui-text))]">
                                Quer validar essa plataforma na sua operacao?
                            </h2>
                            <p className="mt-4 text-sm md:text-base leading-relaxed text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto">
                                Podemos mostrar a prova operacional ou discutir seu cenario com implantacao supervisionada.
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    href="/contato"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-transparent bg-[hsl(var(--ui-accent-blue))] px-6 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--ui-accent-blue-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
                                >
                                    Falar com o time
                                </Link>
                                <Link
                                    href="/proof"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--ui-border))] px-6 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ui-page))]"
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

function ModulePill({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-[hsl(var(--ui-border)/0.55)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--ui-text-subtle))]">
            {label}
        </span>
    );
}
