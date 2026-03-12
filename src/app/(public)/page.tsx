import {
    Truck, BarChart3, Bot, MessageSquare, Shield, Zap,
    Package, Users, Clock, TrendingUp, Workflow, LayoutDashboard,
    Target, Inbox, ScanSearch, FileCheck, MapPin,
    Gauge, Smartphone,
} from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection,
    FeatureGrid, CTASection, ModuleGrid, ComparisonBand, OperationFlow,
    FlowSection, TrustBand, FaqSection, ScrollReveal,
} from '@/ui/site';
import Link from 'next/link';

export const metadata = {
    title: 'Condstore OS — Infraestrutura operacional premium para logística B2B',
    description: 'O sistema operacional que unifica frete, vendas, atendimento e inteligência artificial em uma única plataforma. Elimine planilhas, integrações frágeis e operação manual.',
};

export const revalidate = 86400;

export default function HomePage() {
    return (
        <>
            {/* ━━━ 1. HERO ━━━ */}
            <HeroSection
                eyebrow="Infraestrutura operacional premium"
                title={
                    <>
                        O sistema operacional{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            que a sua logística merece.
                        </span>
                    </>
                }
                subtitle="Frete, vendas, atendimento e IA em uma única plataforma — construída para operações reais no Brasil."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Como funciona', href: '/como-funciona', variant: 'secondary' },
                ]}
            />

            {/* ━━━ 2. TRUST BAND ━━━ */}
            <TrustBand />

            {/* ━━━ 3. DOR OPERACIONAL ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="O problema"
                            title="A operação logística brasileira ainda opera no escuro."
                        />
                        <FeatureGrid
                            columns={4}
                            items={[
                                {
                                    icon: Clock,
                                    title: 'Cotação lenta',
                                    description: 'Telefonema, espera, digitação manual. 15 minutos por cotação.',
                                },
                                {
                                    icon: Package,
                                    title: 'Pedidos invisíveis',
                                    description: 'WhatsApp → ERP → NF. Ninguém sabe o status real.',
                                },
                                {
                                    icon: MessageSquare,
                                    title: 'Atendimento cego',
                                    description: 'Operador responde sem saber se a entrega atrasou.',
                                },
                                {
                                    icon: TrendingUp,
                                    title: 'Margem invisível',
                                    description: 'Sem visibilidade de custo por envio, a margem desaparece.',
                                },
                            ]}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 4. A VIRADA ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="A virada"
                            title="Do caos para controle total."
                        />
                        <ComparisonBand
                            left={{
                                label: 'Antes',
                                tone: 'negative',
                                items: [
                                    'Cotação manual por telefone',
                                    'Pedido sem estado definido',
                                    'Atendimento desconectado da logística',
                                    'Margem calculada uma vez por mês',
                                    'Cada ferramenta é um silo',
                                ],
                            }}
                            right={{
                                label: 'Com o Condstore OS',
                                tone: 'positive',
                                items: [
                                    'Cotação multi-transportadora automática',
                                    'Pedido rastreado do checkout à entrega',
                                    'Atendente vê contexto completo',
                                    'Margem visível por transportadora e região',
                                    'Uma plataforma, um fluxo operacional',
                                ],
                            }}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 5. FLUXO INTERATIVO ━━━ */}
            <ScrollReveal>
                <PageSection spacing="xl" borderTop id="operacao">
                    <PageContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
                            {/* Left: editorial intro */}
                            <div className="lg:sticky lg:top-32">
                                <SectionIntro
                                    eyebrow="O sistema vivo"
                                    title="Do WhatsApp ao cockpit em um único fluxo."
                                    description="Cada etapa alimenta a próxima. O contexto nunca se perde. O operador nunca começa do zero."
                                    align="left"
                                />
                                <div className="mt-8 flex items-center gap-4">
                                    <div className="flex -space-x-1.5">
                                        {['bg-[hsl(var(--ui-accent-blue))]', 'bg-[hsl(var(--ui-success))]', 'bg-[hsl(var(--ui-accent-blue-strong))]'].map((bg, i) => (
                                            <div key={i} className={`h-8 w-8 rounded-full border-2 border-[hsl(var(--ui-page))] ${bg} flex items-center justify-center`}>
                                                <span className="text-[9px] font-bold text-white">{['C', 'P', 'L'][i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] font-medium">
                                        Conversas → Pedidos → Logística
                                    </span>
                                </div>
                            </div>

                            {/* Right: the pipeline */}
                            <div className="relative">
                                <div className="absolute -top-8 -bottom-8 -left-4 -right-4 rounded-3xl border border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.15)]" />
                                <div className="relative z-10 p-2 md:p-4">
                                    <OperationFlow
                                        steps={[
                                            {
                                                icon: Inbox,
                                                label: 'Nova mensagem recebida',
                                                detail: 'WhatsApp, portal ou API. O sistema captura e notifica em tempo real.',
                                            },
                                            {
                                                icon: Users,
                                                label: 'Cliente identificado',
                                                detail: 'Perfil, histórico de pedidos e conversas anteriores carregados automaticamente.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: ScanSearch,
                                                label: 'Intenção detectada',
                                                detail: 'Frank Supremo analisa a mensagem e identifica: cotação, pedido, tracking ou suporte.',
                                            },
                                            {
                                                icon: Zap,
                                                label: 'Simulação criada',
                                                detail: 'Cotação multi-transportadora gerada em milissegundos com margem calculada.',
                                            },
                                            {
                                                icon: FileCheck,
                                                label: 'Pedido confirmado',
                                                detail: 'Pedido registrado com estado, responsável e timeline de eventos.',
                                                accent: 'var(--ui-success)',
                                            },
                                            {
                                                icon: MapPin,
                                                label: 'Logística em andamento',
                                                detail: 'Etiqueta gerada, coleta agendada, tracking ativo. Exceções detectadas.',
                                            },
                                            {
                                                icon: Gauge,
                                                label: 'Cockpit atualizado',
                                                detail: 'Métricas, SLA e dashboards alimentados automaticamente. Ciclo fechado.',
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 6. MÓDULOS ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Ecossistema"
                            title="Módulos que trabalham juntos."
                        />
                        <ModuleGrid
                            modules={[
                                {
                                    icon: Truck,
                                    name: 'Condstore Envios',
                                    tagline: 'Gateway de frete',
                                    description: 'Cotação, despacho e tracking multi-transportadora com tabelas próprias.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Users,
                                    name: 'Condstore CRM',
                                    tagline: 'Vendas B2B',
                                    description: 'Visão 360 do cliente conectada a pedidos, conversas e simulações.',
                                    accentClass: 'text-[hsl(var(--ui-success))]',
                                },
                                {
                                    icon: Workflow,
                                    name: 'DOMINE',
                                    tagline: 'Motor de eventos',
                                    description: 'Processamento assíncrono com DLQ, retry e auditoria completa.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: LayoutDashboard,
                                    name: 'Cockpit OS',
                                    tagline: 'Centro de comando',
                                    description: 'Métricas, alertas, filas de ação e diagnóstico em tempo real.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Bot,
                                    name: 'Frank Supremo',
                                    tagline: 'IA operacional',
                                    description: 'Análise de padrões, sugestões de ação e atendimento via WhatsApp.',
                                    accentClass: 'text-[hsl(var(--ui-accent-blue))]',
                                },
                                {
                                    icon: Shield,
                                    name: 'Zero-Trust',
                                    tagline: 'Segurança nativa',
                                    description: 'Multi-tenant, RBAC, audit trail e detecção de anomalias.',
                                    accentClass: 'text-[hsl(var(--ui-danger))]',
                                },
                                {
                                    icon: Smartphone,
                                    name: 'App do Ecossistema',
                                    tagline: 'Acesso distribuído',
                                    description: 'Cada perfil acessa o que precisa: gestor, operador, cliente, entregador.',
                                    accentClass: 'text-[hsl(var(--ui-success))]',
                                },
                            ]}
                        />
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 7. RESULTADOS DO CLIENTE ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Resultados"
                            title="Benefícios que aparecem no caixa."
                        />
                        <FeatureGrid
                            columns={3}
                            items={[
                                {
                                    icon: Zap,
                                    title: 'Cotação em milissegundos',
                                    description: 'Multi-transportadora com tabela própria e API. Sem telefonema.',
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Margem visível por envio',
                                    description: 'Custo real por transportadora, região e canal. Decisão baseada em dado.',
                                },
                                {
                                    icon: Target,
                                    title: 'SLA auditável',
                                    description: 'Prazo prometido vs. real, por rota. Exceções flagradas automaticamente.',
                                },
                                {
                                    icon: MessageSquare,
                                    title: 'Atendimento com contexto',
                                    description: 'Pedido, frete, tracking e histórico em uma tela antes de responder.',
                                },
                                {
                                    icon: Shield,
                                    title: 'Segurança corporativa',
                                    description: 'Multi-tenant, RBAC, audit trail e detecção de anomalias.',
                                },
                                {
                                    icon: Bot,
                                    title: 'IA governada',
                                    description: 'Analisa padrões e sugere ações — o operador tem a palavra final.',
                                },
                            ]}
                        />

                        {/* Customer segments — merged into outcomes */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                            {[
                                { title: 'Distribuidores B2B', desc: 'Centenas de envios diários, múltiplas transportadoras, controle de margem.' },
                                { title: 'Operadores logísticos', desc: 'Coleta, tracking e pós-venda para vários embarcadores em um cockpit.' },
                                { title: 'E-commerce B2B', desc: 'Venda por WhatsApp com cotação automática e gestão integrada ao frete.' },
                            ].map((segment) => (
                                <div key={segment.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]">
                                    <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{segment.title}</h3>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{segment.desc}</p>
                                </div>
                            ))}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 8. SEGURANÇA / GOVERNANÇA ━━━ */}
            <ScrollReveal>
                <PageSection spacing="lg" borderTop>
                    <PageContainer>
                        <SectionIntro
                            eyebrow="Governança"
                            title="Segurança que não é checklist — é arquitetura."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: Shield, title: 'Multi-tenant isolado', desc: 'Cada empresa em seu próprio contexto. Dados nunca se misturam.' },
                                { icon: Users, title: 'RBAC nativo', desc: 'Controle granular de acesso por papel: admin, operador, viewer.' },
                                { icon: FileCheck, title: 'Audit trail', desc: 'Cada ação registrada com timestamp, autor e contexto.' },
                                { icon: ScanSearch, title: 'Anomaly detection', desc: 'Detecção automática de padrões suspeitos e alertas em tempo real.' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.4)]">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-danger)/0.08)] mb-4">
                                            <Icon className="h-5 w-5 text-[hsl(var(--ui-danger))]" />
                                        </div>
                                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">{item.title}</h3>
                                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </PageContainer>
                </PageSection>
            </ScrollReveal>

            {/* ━━━ 9. FAQ ━━━ */}
            <ScrollReveal>
                <FaqSection />
            </ScrollReveal>

            {/* ━━━ 10. CTA FINAL ━━━ */}
            <CTASection
                title="Pronto para profissionalizar sua operação?"
                subtitle="Infraestrutura de verdade para logística de verdade."
                ctas={[
                    { label: 'Começar agora', href: '/signup' },
                    { label: 'Falar com o time', href: '/about', variant: 'secondary' },
                ]}
            />
        </>
    );
}
