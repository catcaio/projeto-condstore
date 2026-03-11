import {
    LayoutDashboard, MessageSquare, Users, Package, Truck, Bot,
    BarChart3, Link2, Eye, Brain, Blocks, Shield, UserCheck,
    FileText, Fingerprint, Settings, Rocket, Workflow, Database,
    Globe, Sparkles,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection,
} from '@/ui/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Plataforma — Condstore OS',
    description: 'Conheça a arquitetura do Condstore OS: como conversas, clientes, pedidos e logística se conectam em uma plataforma operacional única com contexto contínuo.',
    robots: { index: true, follow: true },
};

export default function PlataformaPage() {
    return (
        <>
            {/* ─── 1. HERO ─── */}
            <HeroSection
                eyebrow="Plataforma operacional"
                title={
                    <>
                        Uma plataforma para conectar{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            atendimento, operação e decisão.
                        </span>
                    </>
                }
                subtitle="O Condstore OS organiza conversas, clientes, pedidos e logística em uma estrutura operacional única com contexto contínuo."
                ctas={[
                    { label: 'Ver como funciona', href: '/como-funciona' },
                    { label: 'Explorar soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />

            {/* ─── 2. O QUE É A PLATAFORMA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Visão geral"
                        title="Um sistema operacional para logística, não um conjunto de features."
                        description="O Condstore OS não é um aglomerado de ferramentas. É uma plataforma construída para que cada módulo se comunique, cada dado tenha contexto, e cada operador tenha visibilidade."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: Link2,
                                title: 'Contexto contínuo',
                                description: 'Cada entidade — pedido, cliente, conversa — carrega seu histórico completo. O operador nunca começa do zero.',
                            },
                            {
                                icon: Blocks,
                                title: 'Módulos conectados',
                                description: 'Conversas ligam a clientes, clientes ligam a pedidos, pedidos ligam a logística. Tudo via deep links operacionais.',
                            },
                            {
                                icon: Eye,
                                title: 'Visibilidade operacional',
                                description: 'Cockpit centraliza métricas, alertas e filas de ação. Cada módulo alimenta o dashboard com dados reais.',
                            },
                            {
                                icon: Brain,
                                title: 'Inteligência integrada',
                                description: 'Frank Supremo analisa padrões, sugere ações e interage com clientes — governado por budget e permissões.',
                            },
                            {
                                icon: Shield,
                                title: 'Governança para escalar',
                                description: 'Multi-tenant, RBAC, audit trail e configuração por tenant. A plataforma cresce sem perder controle.',
                            },
                            {
                                icon: Workflow,
                                title: 'Event-driven nativo',
                                description: 'Cada ação gera um evento auditável. Processamento assíncrono com retry, DLQ e observabilidade completa.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 3. VISÃO DO ECOSSISTEMA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <SectionIntro
                        eyebrow="Ecossistema"
                        title="Tudo gira em torno do cliente."
                    />
                    <div className="relative mx-auto max-w-2xl">
                        {/* Concentric rings diagram */}
                        <div className="relative flex flex-col items-center gap-4">
                            {/* Top layer — Intelligence */}
                            <EcoLayer
                                label="Inteligência"
                                items={['Frank Supremo', 'Cockpit OS']}
                                accent="blue"
                                size="sm"
                            />

                            {/* Middle layer — Operational modules */}
                            <EcoLayer
                                label="Módulos operacionais"
                                items={['Conversas', 'Pedidos', 'Logística', 'Simulações', 'Métricas']}
                                accent="blue"
                                size="md"
                            />

                            {/* Center — Client */}
                            <div className="flex items-center justify-center w-32 h-32 rounded-full border-2 border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue)/0.08)]">
                                <div className="text-center">
                                    <Users className="h-7 w-7 text-[hsl(var(--ui-accent-blue))] mx-auto mb-1" />
                                    <span className="text-sm font-bold text-[hsl(var(--ui-text))]">Cliente</span>
                                </div>
                            </div>

                            {/* Bottom layer — Operational modules (mirror) */}
                            <EcoLayer
                                label="Gestão"
                                items={['Clientes', 'CRM', 'Vendas']}
                                accent="green"
                                size="md"
                            />

                            {/* Base layer — Infrastructure */}
                            <EcoLayer
                                label="Infraestrutura"
                                items={['Tenant', 'Governança', 'Integrações', 'Segurança']}
                                accent="muted"
                                size="sm"
                            />
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 4. MÓDULOS PRINCIPAIS ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Módulos"
                        title="Cada módulo tem responsabilidade clara."
                        description="Juntos, formam o sistema operacional completo. Cada módulo se conecta aos outros por deep links e eventos."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ModuleCard
                            icon={LayoutDashboard}
                            name="Cockpit"
                            role="Centro de comando"
                            description="Dashboard unificado com métricas, alertas, filas de ação e diagnóstico do sistema. O operador vê tudo em uma tela."
                            connections="Recebe dados de todos os módulos"
                        />
                        <ModuleCard
                            icon={MessageSquare}
                            name="Conversas"
                            role="Atendimento contextual"
                            description="Cada conversa carrega o contexto do cliente, pedidos abertos e status logístico. O operador responde com informação, não com adivinhação."
                            connections="Conecta a Clientes, Pedidos, Frank"
                        />
                        <ModuleCard
                            icon={Users}
                            name="Clientes"
                            role="Visão 360"
                            description="Perfil completo do cliente com histórico de pedidos, conversas, simulações e métricas. CRM operacional, não genérico."
                            connections="Conecta a Conversas, Pedidos, Logística"
                        />
                        <ModuleCard
                            icon={Package}
                            name="Pedidos"
                            role="Pipeline operacional"
                            description="Do checkout ao ponto de entrega. Cada pedido tem estado definido, responsável atribuído e timeline de eventos."
                            connections="Conecta a Logística, Clientes, Métricas"
                        />
                        <ModuleCard
                            icon={Truck}
                            name="Logística"
                            role="Gateway de frete"
                            description="Cotação multi-transportadora, despacho, tracking e exceções. Tabelas próprias normalizadas com fallback automático."
                            connections="Conecta a Pedidos, Métricas, Cockpit"
                        />
                        <ModuleCard
                            icon={Bot}
                            name="Frank Supremo"
                            role="IA operacional"
                            description="Analisa padrões, sugere ações, interage com clientes via WhatsApp. Governado por budget de tokens e permissões por tenant."
                            connections="Conecta a Conversas, Clientes, Cockpit"
                        />
                        <ModuleCard
                            icon={BarChart3}
                            name="Métricas"
                            role="Observabilidade"
                            description="Dashboard de margem por transportadora, SLA auditável, performance por região e canal. Dados alimentados automaticamente."
                            connections="Recebe dados de Logística e Pedidos"
                        />
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 5. CAMADAS TRANSVERSAIS ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Camadas transversais"
                        title="O que conecta tudo por baixo."
                        description="Cada módulo opera de forma independente, mas compartilha camadas transversais que garantem consistência, rastreabilidade e inteligência."
                    />
                    <FeatureGrid
                        columns={3}
                        items={[
                            {
                                icon: Link2,
                                title: 'Deep links operacionais',
                                description: 'Cada entidade tem uma URL canônica. Qualquer lugar do sistema pode linkar para o pedido, cliente ou conversa específica.',
                            },
                            {
                                icon: Database,
                                title: 'Contexto contínuo',
                                description: 'O histórico de cada entidade está sempre disponível. O operador vê timeline, eventos e relações sem sair da tela atual.',
                            },
                            {
                                icon: Eye,
                                title: 'Observabilidade',
                                description: 'Logs estruturados, métricas de performance e health checks integrados. O sistema diagnostica a si mesmo.',
                            },
                            {
                                icon: Brain,
                                title: 'Inteligência integrada',
                                description: 'IA não é um módulo isolado — ela permeia conversas, sugestões e análises em toda a plataforma.',
                            },
                            {
                                icon: Blocks,
                                title: 'Escalabilidade modular',
                                description: 'Novos módulos se conectam ao ecossistema via contratos bem definidos. A plataforma cresce sem reescrever o que existe.',
                            },
                            {
                                icon: Workflow,
                                title: 'Event sourcing',
                                description: 'Cada mutação gera um evento imutável. Replay, auditoria e análise histórica são nativos da plataforma.',
                            },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── 6. GOVERNANÇA ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Governança"
                        title="Controle que escala junto com a operação."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: Globe, title: 'Multi-tenant', desc: 'Isolamento completo de dados, configurações e permissões por tenant. Cada operação é independente.' },
                            { icon: UserCheck, title: 'RBAC', desc: 'Controle de acesso granular por papel. Admin, operador, viewer — cada perfil vê e faz apenas o que deve.' },
                            { icon: FileText, title: 'Logs e rastreabilidade', desc: 'Audit trail completo. Cada ação, mutação e acesso é registrado com timestamp, IP e ator.' },
                            { icon: Fingerprint, title: 'Autenticação segura', desc: 'Sessions com rotação, rate limiting por IP/tenant, detecção de anomalias e bloqueio automático.' },
                            { icon: Settings, title: 'Configuração por tenant', desc: 'Cada tenant define suas transportadoras, regras de margem, webhooks e preferências de IA.' },
                            { icon: Shield, title: 'Zero-Trust', desc: 'Nenhuma requisição é confiável por padrão. Cada endpoint valida autenticação, permissão e tenant.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-7">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] mb-4">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 7. EVOLUÇÃO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Evolução"
                        title="A plataforma cresce com a sua operação."
                        description="O Condstore OS é projetado para evoluir continuamente sem reescrever o que já funciona."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: Blocks, title: 'Novos módulos', desc: 'Cada módulo se conecta via contratos bem definidos. Adicionar funcionalidade não quebra o existente.' },
                            { icon: Workflow, title: 'Automações', desc: 'Regras de negócio configuráveis por tenant que executam ações automáticas baseadas em eventos do sistema.' },
                            { icon: Sparkles, title: 'IA operacional', desc: 'Frank Supremo evolui com novos modelos, análises e interações — sempre sob governança de budget e permissões.' },
                            { icon: Database, title: 'Memória de operação', desc: 'O sistema acumula inteligência ao longo do tempo. Padrões, anomalias e benchmarks são aprendidos continuamente.' },
                            { icon: Globe, title: 'Portal do cliente', desc: 'Visibilidade self-service para o cliente final: tracking, histórico e comunicação direta com a operação.' },
                            { icon: Rocket, title: 'Marketplace de integrações', desc: 'Conectores para transportadoras, ERPs e marketplaces se somam ao ecossistema sem fricção.' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="group rounded-2xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.2)] p-6 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]">
                                    <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))] mb-4" />
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── 8. CTA FINAL ─── */}
            <CTASection
                title="Entenda como essa estrutura se traduz em soluções aplicadas."
                subtitle="Veja como cada módulo resolve problemas reais da sua operação."
                ctas={[
                    { label: 'Ver como funciona', href: '/como-funciona' },
                    { label: 'Explorar soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />
        </>
    );
}

/* ─── Helper: Ecosystem layer ring ─── */
function EcoLayer({ label, items, accent, size }: {
    label: string;
    items: string[];
    accent: 'blue' | 'green' | 'muted';
    size: 'sm' | 'md';
}) {
    const colors = {
        blue: {
            border: 'border-[hsl(var(--ui-accent-blue)/0.25)]',
            bg: 'bg-[hsl(var(--ui-accent-blue)/0.04)]',
            label: 'text-[hsl(var(--ui-accent-blue))]',
            pill: 'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue-ink,var(--ui-accent-blue)))]',
        },
        green: {
            border: 'border-[hsl(var(--ui-success)/0.25)]',
            bg: 'bg-[hsl(var(--ui-success)/0.04)]',
            label: 'text-[hsl(var(--ui-success))]',
            pill: 'bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success-ink,var(--ui-success)))]',
        },
        muted: {
            border: 'border-[hsl(var(--ui-border)/0.4)]',
            bg: 'bg-[hsl(var(--ui-surface)/0.3)]',
            label: 'text-[hsl(var(--ui-text-subtle))]',
            pill: 'bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text-muted))]',
        },
    };

    const c = colors[accent];

    return (
        <div className={`w-full rounded-2xl border ${c.border} ${c.bg} ${size === 'sm' ? 'px-5 py-4' : 'px-6 py-5'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${c.label} block mb-2.5`}>
                {label}
            </span>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <span key={item} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${c.pill}`}>
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ─── Helper: Module detail card ─── */
function ModuleCard({ icon: Icon, name, role, description, connections }: {
    icon: typeof LayoutDashboard;
    name: string;
    role: string;
    description: string;
    connections: string;
}) {
    return (
        <div className="group flex flex-col gap-3 rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6 md:p-7 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)]">
                    <Icon className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] tracking-tight">{name}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--ui-accent-blue))]">{role}</span>
                </div>
            </div>
            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{description}</p>
            <span className="text-[11px] text-[hsl(var(--ui-text-subtle))] font-medium mt-auto pt-2 border-t border-[hsl(var(--ui-border)/0.3)]">
                ↔ {connections}
            </span>
        </div>
    );
}
